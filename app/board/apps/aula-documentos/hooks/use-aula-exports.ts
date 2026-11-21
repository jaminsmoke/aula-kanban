import { useState } from "react";
import type { AulaDocument, AulaPrintPage } from "../../../../../lib/domain/aula-documentos/document";
import { documentToMarkdownExport } from "../../../../../lib/domain/aula-documentos/markdown";
import { aulaFileName } from "../../../../../lib/domain/aula-documentos/filename";
import { buildAulaDocumentHtml, collectMermaidCodes, renderMermaidSvgs } from "../../../shared/aula-documentos/export-html";
import { getMermaidRenderer } from "../../../shared/aula-documentos/mermaid-renderer";
import { printHtmlDocument } from "../../../shared/aula-documentos/print-html";
import { exportAulaDocx, exportAulaPptx } from "../../../shared/office/office-export";
import { loadExportImages } from "../utils/document-assets";
import { downloadBlob, downloadTextFile } from "../../../shared/ui/download";

type ExportsDeps = {
  currentDocument: () => AulaDocument | null;
  presentationNotes: Record<string, string>;
  presentationPage: AulaPrintPage;
  setStatus: (message: string) => void;
};

/**
 * Prepara las exportaciones HTML, impresión, Markdown y Office.
 * @param deps - Documento actual y notas de presentación.
 * @returns Estado y acciones de exportación.
 */
export function useAulaExports({ currentDocument, presentationNotes, presentationPage, setStatus }: ExportsDeps) {
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exportingOffice, setExportingOffice] = useState(false);

  /**
   * Prepara y descarga el HTML autónomo del documento.
   */
  async function exportHtml() {
    const document = currentDocument();
    if (!document) return;
    setExporting(true);
    setStatus("Preparando HTML, diagramas e imágenes…");
    try {
      const svgByCode = await renderMermaidSvgs(
        collectMermaidCodes(document.content),
        (code) => getMermaidRenderer().render(code),
      );
      const images = await loadExportImages(document.content);
      const html = buildAulaDocumentHtml(
        document,
        svgByCode,
        images.sources,
        new Set(images.failed),
      );
      downloadTextFile(html, "text/html;charset=utf-8", aulaFileName(document.title, "html"));
      setStatus(images.failed.length
        ? `HTML descargado con ${images.failed.length} ${images.failed.length === 1 ? "imagen no disponible" : "imágenes no disponibles"}.`
        : "HTML descargado.");
    } catch {
      setStatus("No se pudo preparar el HTML del documento.");
    } finally {
      setExporting(false);
    }
  }

  /**
   * Prepara y abre la impresión o el PDF del documento.
   */
  async function printDocument() {
    const document = currentDocument();
    if (!document) return;
    setPrinting(true);
    setStatus("Preparando impresión, diagramas e imágenes…");
    try {
      const svgByCode = await renderMermaidSvgs(
        collectMermaidCodes(document.content),
        (code) => getMermaidRenderer().render(code),
      );
      const images = await loadExportImages(document.content);
      printHtmlDocument(buildAulaDocumentHtml(
        document,
        svgByCode,
        images.sources,
        new Set(images.failed),
        presentationPage,
      ));
      setStatus(images.failed.length
        ? `Vista de impresión abierta con ${images.failed.length} ${images.failed.length === 1 ? "imagen no disponible" : "imágenes no disponibles"}.`
        : "Vista de impresión abierta.");
    } catch {
      setStatus("No se pudo preparar la impresión del documento.");
    } finally {
      setPrinting(false);
    }
  }

  /**
   * Exporta el documento al subconjunto Markdown.
   */
  function exportMarkdown() {
    const document = currentDocument();
    if (!document) return;
    const exported = documentToMarkdownExport(document);
    downloadTextFile(
      exported.markdown,
      "text/markdown;charset=utf-8",
      aulaFileName(document.title, "md"),
    );
    setStatus(exported.warnings.length
      ? `Markdown descargado. ${exported.warnings.join(" ")}`
      : "Markdown descargado.");
  }

  /**
   * Exporta el documento a una copia DOCX o PPTX.
   * @param format - Formato de destino.
   */
  async function exportOffice(format: "docx" | "pptx") {
    const document = currentDocument();
    if (!document) return;
    setExportingOffice(true);
    setStatus(`Preparando ${format.toUpperCase()}…`);
    try {
      const images = await loadExportImages(document.content);
      const result = format === "docx"
        ? await exportAulaDocx(document, images.assets)
        : await exportAulaPptx(document, presentationNotes, images.assets);
      downloadBlob(result.blob, aulaFileName(document.title, format));
      setStatus(result.warnings.length
        ? `${format.toUpperCase()} descargado. ${result.warnings.join(" ")}`
        : `${format.toUpperCase()} descargado.`);
    } catch {
      setStatus(`No se pudo preparar el archivo ${format.toUpperCase()}.`);
    } finally {
      setExportingOffice(false);
    }
  }

  return {
    exporting,
    printing,
    exportingOffice,
    exportHtml,
    printDocument,
    exportMarkdown,
    exportOffice,
  };
}
