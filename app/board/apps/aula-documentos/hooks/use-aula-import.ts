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
    try {
      const source = await file.text();
      if (source.length > AULA_DOCUMENT_MARKDOWN_MAX_LENGTH) {
        setImportError("El Markdown supera el tamaño permitido.");
        return;
      }
      const converted = markdownToDocument(source, {
        stripTitleHeading: true,
        titleFallback: file.name.replace(/\.[^.]+$/, "") || "Documento importado",
      });
      const parsed = parseAulaDocument({
        schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
        title: converted.title,
        content: converted.content,
      });
      if (!parsed.ok) {
        setImportError(parsed.message);
        return;
      }
      setImportPreview({
        source: "markdown",
        document: parsed.document,
        stats: parsed.stats,
        warnings: converted.warnings,
        sourceUpdatedAt: null,
      });
    } catch {
      setImportError("No se pudo leer el archivo Markdown.");
    } finally {
      setImportLoading(null);
    }
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
