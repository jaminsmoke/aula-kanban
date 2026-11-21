import type { JSONContent } from "@tiptap/core";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { buildPresentationSlides } from "../../../../lib/domain/aula-documentos/presentation";
import type { AulaImageAssetMap } from "../aula-documentos/export-images";
import { contentInlineText } from "../../../../lib/domain/aula-documentos/text";
import { addWarning, type OfficeExportResult } from "./office-export-common";

/** Celda de una tabla PPTX con su estructura visual. */
type PptxTableCell = {
  text: string;
  colspan: number;
  rowspan: number;
  header: boolean;
};

/** Elemento de una diapositiva en el orden del documento. */
type PptxSlideItem =
  | { kind: "text"; text: string; bullet: boolean; heading: boolean }
  | { kind: "table"; rows: PptxTableCell[][] }
  | { kind: "image"; source: string; alt: string; caption: string; width: number; alignment: string };

/**
 * Convierte los bloques de una diapositiva en elementos ordenados para PPTX.
 * @param blocks - Bloques de la diapositiva.
 * @param title - Título de la diapositiva.
 * @returns Texto, tablas e imágenes en orden.
 */
function slideContent(blocks: JSONContent[], title: string): { items: PptxSlideItem[] } {
  const items: PptxSlideItem[] = [];
  const visit = (nodes: JSONContent[], bullet = false) => {
    for (const node of nodes) {
      if (node.type === "heading" && contentInlineText(node).trim() === title) continue;
      if (node.type === "heading" || node.type === "paragraph") {
        const text = contentInlineText(node).trim();
        if (text) items.push({ kind: "text", text, bullet, heading: node.type === "heading" });
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        for (const item of node.content ?? []) visit(item.content ?? [], true);
      } else if (node.type === "taskList") {
        for (const item of node.content ?? []) {
          const text = (item.content ?? []).map(contentInlineText).join(" ").trim();
          if (text) items.push({ kind: "text", text, bullet: true, heading: false });
        }
      } else if (node.type === "table") {
        items.push({
          kind: "table",
          rows: (node.content ?? []).map((row) => (row.content ?? []).map((cell) => ({
            text: contentInlineText(cell),
            colspan: Math.max(1, Number(cell.attrs?.colspan) || 1),
            rowspan: Math.max(1, Number(cell.attrs?.rowspan) || 1),
            header: cell.type === "tableHeader",
          }))),
        });
      } else if (node.type === "codeBlock" || node.type === "mermaidBlock") {
        const text = node.type === "mermaidBlock" ? String(node.attrs?.code ?? "") : contentInlineText(node);
        if (text) items.push({ kind: "text", text, bullet: false, heading: false });
      } else if (node.type === "aulaImage") {
        items.push({
          kind: "image",
          source: typeof node.attrs?.src === "string" ? node.attrs.src : "",
          alt: typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "",
          caption: typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "",
          width: Math.max(10, Math.min(100, Number(node.attrs?.width) || 100)),
          alignment: typeof node.attrs?.alignment === "string" ? node.attrs.alignment : "center",
        });
      } else if (node.type === "blockquote") {
        visit(node.content ?? [], bullet);
      }
    }
  };
  visit(blocks);
  return { items };
}

/**
 * Exporta un documento Aula a PPTX.
 * @param document - Documento validado.
 * @param notes - Notas del orador por índice de diapositiva.
 * @param images - Imágenes resueltas para incrustar.
 * @returns El archivo y los avisos de fidelidad.
 */
export async function exportAulaPptx(
  document: AulaDocument,
  notes: Record<string, string> = {},
  images: AulaImageAssetMap = new Map(),
): Promise<OfficeExportResult> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const warnings: string[] = [];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Aula Documentos";
  pptx.title = document.title.trim() || "Presentación";
  const slides = buildPresentationSlides(document.content);

  slides.forEach((source, index) => {
    const slide = pptx.addSlide();
    slide.addText(source.title, {
      x: 0.6,
      y: 0.4,
      w: 12,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: "211B36",
    });
    const content = slideContent(source.content, source.title);
    let y = 1.4;
    for (const item of content.items) {
      if (item.kind === "text") {
        if (item.heading) addWarning(warnings, "Los títulos internos se exportan como texto.");
        slide.addText(item.text, {
          x: item.bullet ? 1.0 : 0.75,
          y,
          w: 11.4,
          h: 0.4,
          fontSize: item.heading ? 20 : 16,
          bold: item.heading,
          bullet: item.bullet ? true : undefined,
          color: "211B36",
        });
        y += item.heading ? 0.55 : 0.42;
        continue;
      }

      if (item.kind === "table") {
        slide.addTable(item.rows.map((row) => row.map((cell) => ({
          text: cell.text,
          options: {
            ...(cell.colspan > 1 ? { colspan: cell.colspan } : {}),
            ...(cell.rowspan > 1 ? { rowspan: cell.rowspan } : {}),
            ...(cell.header ? { bold: true, fill: { color: "F1EFF8" } } : {}),
          },
        }))), {
          x: 0.75,
          y,
          w: 11.4,
          fontSize: 11,
          border: { pt: 1, color: "D9D9D9" },
        });
        y += Math.min(3, item.rows.length * 0.35 + 0.2);
        continue;
      }

      const asset = images.get(item.source);
      if (!asset?.office) {
        addWarning(warnings, "Una imagen no se pudo incrustar en el PPTX.");
        slide.addText(item.alt ? `Imagen no disponible: ${item.alt}` : "Imagen no disponible", {
          x: 0.75,
          y,
          w: 11.4,
          h: 0.4,
          fontSize: 12,
          italic: true,
          color: "8A2F2F",
        });
        y += 0.42;
        continue;
      }
      if (!item.alt) addWarning(warnings, "Una imagen no tiene texto alternativo.");

      const ratio = asset.office.height / Math.max(1, asset.office.width);
      let imageWidth = 11.4 * item.width / 100;
      let imageHeight = imageWidth * ratio;
      const availableHeight = Math.max(1.2, 7.1 - y - (item.caption ? 0.35 : 0.1));
      if (imageHeight > availableHeight) {
        imageHeight = availableHeight;
        imageWidth = imageHeight / Math.max(0.01, ratio);
        addWarning(warnings, "Una imagen se ajustó para caber en la diapositiva.");
      }
      const x = item.alignment === "left"
        ? 0.75
        : item.alignment === "right"
          ? 13.333 - 0.75 - imageWidth
          : (13.333 - imageWidth) / 2;
      slide.addImage({
        data: asset.office.dataUrl,
        x,
        y,
        w: imageWidth,
        h: imageHeight,
        altText: item.alt || item.caption || "Imagen del documento",
        ...(item.caption ? { objectName: item.caption } : {}),
      });
      y += imageHeight + 0.12;
      if (item.caption) {
        slide.addText(item.caption, {
          x: 0.75,
          y,
          w: 11.4,
          h: 0.3,
          fontSize: 11,
          italic: true,
          align: "center",
          color: "625C74",
        });
        y += 0.3;
      }
    }
    const note = notes[String(index)]?.trim();
    if (note) slide.addNotes(note);
  });

  const output = await pptx.write({ outputType: "blob" });
  if (output instanceof Blob) return { blob: output, warnings };
  const part = typeof output === "string"
    ? output
    : output instanceof ArrayBuffer
      ? output
      : new Uint8Array(output).slice().buffer;
  return { blob: new Blob([part]), warnings };
}