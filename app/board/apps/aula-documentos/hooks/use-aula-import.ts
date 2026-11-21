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
import { importOfficeFile } from "../formatos/office/office-import";
import { detectOfficeFormat } from "../../../../../lib/domain/aula-documentos/office-model";

export type ImportPreviewState = AulaDocumentImportPreview & {
  sourceUpdatedAt: number | null;
  sourceName: string | null;
};

const DUPLICATE_WARNING = "Ya abierto.";

export const IMPORT_LABELS: Record<AulaDocumentImportPreview["source"], string> = {
  documentos: "Notas y documentos",
  mermaid: "Diagramas",
  presentaciones: "Presentaciones",
  markdown: "Markdown",
  office: "Documento de Office",
  text: "Texto",
  json: "JSON",
};

type MarkdownPreviewResult =
  | { ok: true; preview: ImportPreviewState }
  | { ok: false; message: string };

/**
 * Convierte Markdown en la vista previa común.
 * @param source - Texto Markdown o pegado.
 * @param titleFallback - Título cuando no hay un encabezado utilizable.
 * @param sourceName - Nombre del archivo o etiqueta de origen.
 * @returns La vista previa validada o un error legible.
 */
function previewMarkdown(
  source: string,
  titleFallback: string,
  sourceName: string | null,
): MarkdownPreviewResult {
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
      sourceName,
    },
  };
}

type ImportDeps = {
  currentDocument: () => AulaDocument | null;
  storeRecoveryCopy: (reason: "replace") => boolean;
  applyDocument: (document: AulaDocument) => void;
  markChanged: (message?: string) => void;
};

/**
 * Lee documentos Markdown, texto, JSON y Office, y gestiona el visor de Office.
 * @param deps - Documento actual y estado compartido.
 * @returns Estado y acciones de importación.
 */
export function useAulaImport({ currentDocument, storeRecoveryCopy, applyDocument, markChanged }: ImportDeps) {
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
   * Muestra una vista previa y decide si repite el contenido abierto.
   * @param preview - Vista previa validada que se va a mostrar.
   */
  function showPreview(preview: ImportPreviewState) {
    const current = currentDocument();
    setImportPreview(current !== null && JSON.stringify(preview.document) === JSON.stringify(current)
      ? { ...preview, warnings: [...preview.warnings, DUPLICATE_WARNING] }
      : preview);
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
   * Prepara el estado común de una importación de archivo.
   * @param loading - Etiqueta del lector que se está usando.
   */
  function beginFileImport(loading: string) {
    setImportLoading(loading);
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    setImportOfficeSource(null);
  }

  /**
   * Lee un archivo Markdown y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function importMarkdown(file: File | undefined) {
    if (!file) return;
    beginFileImport("markdown");
    try {
      const result = previewMarkdown(
        await file.text(),
        file.name.replace(/\.[^.]+$/, "") || "Documento importado",
        file.name,
      );
      if (!result.ok) setImportError(result.message);
      else showPreview(result.preview);
    } catch {
      setImportError("No se pudo leer el archivo Markdown.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Lee un archivo de texto plano y prepara su vista previa literal.
   * @param file - Archivo elegido.
   */
  async function importText(file: File | undefined) {
    if (!file) return;
    beginFileImport("text");
    try {
      const { importPlainTextDocument } = await import("../../../../../lib/domain/aula-documentos/import-formats");
      const result = importPlainTextDocument(
        await file.text(),
        file.name.replace(/\.[^.]+$/, "") || "Texto importado",
      );
      if (!result.ok) setImportError(result.message);
      else showPreview({
        ...result.preview,
        sourceUpdatedAt: null,
        sourceName: file.name,
      });
    } catch {
      setImportError("No se pudo leer el archivo de texto.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Lee un JSON canónico y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function importJson(file: File | undefined) {
    if (!file) return;
    beginFileImport("json");
    try {
      const { importJsonDocument } = await import("../../../../../lib/domain/aula-documentos/import-formats");
      const result = importJsonDocument(await file.text());
      if (!result.ok) setImportError(result.message);
      else showPreview({
        ...result.preview,
        sourceUpdatedAt: null,
        sourceName: file.name,
      });
    } catch {
      setImportError("No se pudo leer el archivo JSON.");
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
    const name = file.name.toLowerCase();
    if (detectOfficeFormat(file.name)) {
      await importOffice(file);
      return;
    }
    if (/\.(md|markdown)$/i.test(name) || file.type === "text/markdown") {
      await importMarkdown(file);
      return;
    }
    if (/\.txt$/i.test(name) || file.type === "text/plain") {
      await importText(file);
      return;
    }
    if (/\.json$/i.test(name) || file.type === "application/json") {
      await importJson(file);
      return;
    }
    setImportPreview(null);
    setImportConfirm(false);
    setImportOfficeSource(null);
    if (/\.(html?|odt|rtf|pdf)$/i.test(name)) {
      setImportError("HTML, ODT, RTF y PDF no se admiten.");
      return;
    }
    setImportError("Formato no admitido.");
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
    const result = previewMarkdown(source, "Texto pegado", null);
    if (!result.ok) setImportError(result.message);
    else showPreview(result.preview);
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
      showPreview({
        ...result.preview,
        sourceUpdatedAt: null,
        sourceName: file.name,
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
    if (JSON.stringify(importPreview.document) === JSON.stringify(currentDocument())) return;
    if (!storeRecoveryCopy("replace")) {
      setImportError("No se pudo guardar una copia local antes de reemplazar. El documento actual no ha cambiado.");
      return;
    }
    applyDocument(importPreview.document);
    const sourceName = importPreview.sourceName ? ` (${importPreview.sourceName})` : "";
    markChanged(`Documento importado desde ${IMPORT_LABELS[importPreview.source]}${sourceName}. Guárdalo para conservarlo.`);
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
