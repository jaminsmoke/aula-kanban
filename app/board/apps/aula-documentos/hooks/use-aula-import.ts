import { useRef, useState } from "react";
import {
  AULA_DOCUMENT_MARKDOWN_MAX_LENGTH,
  markdownToDocument,
} from "../../../../../lib/domain/aula-documentos/markdown";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
  type AulaDocument,
} from "../../../../../lib/domain/aula-documentos/document";
import type { AulaDocumentImportPreview } from "../../../../../lib/domain/aula-documentos/importers";
import { importOfficeFile } from "../../../shared/office/office-import";
import { detectOfficeFormat } from "../../../shared/office/office-model";

export type ImportPreviewState = AulaDocumentImportPreview & {
  sourceUpdatedAt: number | null;
};

export const IMPORT_LABELS: Record<AulaDocumentImportPreview["source"], string> = {
  documentos: "Notas y documentos",
  mermaid: "Diagramas",
  presentaciones: "Presentaciones",
  markdown: "Markdown",
  office: "Documento de Office",
};

type MarkdownPreviewResult =
  | { ok: true; preview: ImportPreviewState }
  | { ok: false; message: string };

/**
 * Convierte Markdown en la vista previa común.
 * @param source - Texto Markdown o pegado.
 * @param titleFallback - Título cuando no hay un encabezado utilizable.
 * @returns La vista previa validada o un error legible.
 */
function previewMarkdown(source: string, titleFallback: string): MarkdownPreviewResult {
  if (source.length > AULA_DOCUMENT_MARKDOWN_MAX_LENGTH) {
    return { ok: false, message: "El Markdown supera el tamaño permitido." };
  }
  const converted = markdownToDocument(source, {
    stripTitleHeading: true,
    titleFallback,
  });
  const parsed = parseAulaDocument({
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: converted.title,
    content: converted.content,
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };
  return {
    ok: true,
    preview: {
      source: "markdown",
      document: parsed.document,
      stats: parsed.stats,
      warnings: converted.warnings,
      sourceUpdatedAt: null,
    },
  };
}

type ImportDeps = {
  storeRecoveryCopy: (reason: "replace") => boolean;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
};

/**
 * Lee documentos Markdown/Office y gestiona el visor de Office.
 * @param deps - Documento actual y estado compartido.
 * @returns Estado y acciones de importación.
 */
export function useAulaImport({ storeRecoveryCopy, applyDocument, markChanged }: ImportDeps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importOfficeSource, setImportOfficeSource] = useState<File | null>(null);
  const [officeOpenSource, setOfficeOpenSource] = useState<File | null>(null);
  const [officePreviewOpen, setOfficePreviewOpen] = useState(false);
  const [officePreviewTitle, setOfficePreviewTitle] = useState("Archivo original");
  const [importLoading, setImportLoading] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const importRef = useRef<HTMLElement>(null);
  const officePreviewRef = useRef<HTMLElement>(null);
  const officeOpenInputRef = useRef<HTMLInputElement>(null);

  /**
   * Abre el diálogo de importación y limpia su estado.
   */
  function openImport() {
    setImportPreview(null);
    setImportOfficeSource(null);
    setOfficeOpenSource(null);
    setOfficePreviewOpen(false);
    setOfficePreviewTitle("Archivo original");
    setImportError(null);
    setImportLoading(null);
    setImportConfirm(false);
    setPasteText("");
    setImportOpen(true);
  }

  /**
   * Cierra el diálogo de importación.
   */
  function closeImport() {
    setImportOpen(false);
    setImportPreview(null);
    setImportOfficeSource(null);
    setOfficeOpenSource(null);
    setOfficePreviewOpen(false);
    setImportError(null);
    setImportLoading(null);
    setImportConfirm(false);
    setPasteText("");
  }

  /**
   * Cierra la vista del archivo de Office.
   */
  function closeOfficePreview() {
    setOfficePreviewOpen(false);
    setOfficeOpenSource(null);
    setOfficePreviewTitle("Archivo original");
  }

  /**
   * Abre un archivo local en el visor Office sin importarlo.
   * @param file - Archivo elegido.
   */
  function openOfficeViewer(file: File | undefined) {
    if (!file) return;
    setOfficeOpenSource(file);
    setOfficePreviewTitle("Visor Office");
    setOfficePreviewOpen(true);
  }

  /**
   * Lee un archivo Markdown y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function importMarkdown(file: File | undefined) {
    if (!file) return;
    setImportLoading("markdown");
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    setImportOfficeSource(null);
    try {
      const result = previewMarkdown(
        await file.text(),
        file.name.replace(/\.[^.]+$/, "") || "Documento importado",
      );
      if (!result.ok) setImportError(result.message);
      else setImportPreview(result.preview);
    } catch {
      setImportError("No se pudo leer el archivo Markdown.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Enruta un archivo elegido o soltado al lector que corresponde.
   * @param file - Archivo del selector o del arrastre.
   */
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (detectOfficeFormat(file.name)) {
      await importOffice(file);
      return;
    }
    if (/\.(md|markdown|txt)$/i.test(file.name) || file.type === "text/markdown" || file.type === "text/plain") {
      await importMarkdown(file);
      return;
    }
    setImportPreview(null);
    setImportConfirm(false);
    setImportOfficeSource(null);
    setImportError("Solo se admiten Markdown (.md/.markdown), texto (.txt) y Office (.docx/.pptx).");
  }

  /**
   * Previsualiza el texto pegado como Markdown.
   * @param text - Contenido pegado por la persona.
   */
  function importPasted(text: string) {
    const source = text.trim();
    if (!source) {
      setImportError("Pega algún texto antes de previsualizar.");
      return;
    }
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    setImportOfficeSource(null);
    const result = previewMarkdown(source, "Texto pegado");
    if (!result.ok) setImportError(result.message);
    else setImportPreview(result.preview);
  }

  /**
   * Lee un DOCX/PPTX y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function importOffice(file: File | undefined) {
    if (!file) return;
    setImportOfficeSource(file);
    setImportLoading("office");
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    try {
      const result = await importOfficeFile(file);
      if (!result.ok) {
        setImportError(result.message);
        return;
      }
      setImportPreview({
        ...result.preview,
        sourceUpdatedAt: null,
      });
    } catch {
      setImportError("No se pudo leer el archivo de Office.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Sustituye el documento actual por la vista previa confirmada.
   */
  function applyImport() {
    if (!importPreview || !importConfirm) return;
    if (!storeRecoveryCopy("replace")) {
      setImportError("No se pudo guardar una copia local antes de reemplazar. El documento actual no ha cambiado.");
      return;
    }
    applyDocument(importPreview.document);
    markChanged(`Documento importado desde ${IMPORT_LABELS[importPreview.source]}. Guárdalo para conservarlo.`);
    closeImport();
  }

  return {
    importOpen,
    setImportOpen,
    importPreview,
    setImportPreview,
    importOfficeSource,
    officeOpenSource,
    officePreviewOpen,
    setOfficePreviewOpen,
    officePreviewTitle,
    setOfficePreviewTitle,
    importLoading,
    importError,
    setImportError,
    importConfirm,
    setImportConfirm,
    pasteText,
    setPasteText,
    importFile,
    importPasted,
    importRef,
    officePreviewRef,
    officeOpenInputRef,
    openImport,
    closeImport,
    closeOfficePreview,
    openOfficeViewer,
    importMarkdown,
    importOffice,
    applyImport,
  };
}
