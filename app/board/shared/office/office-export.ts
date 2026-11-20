import type { JSONContent } from "@tiptap/core";
import type { ExternalHyperlink as DocxHyperlink, Paragraph as DocxParagraph, Table as DocxTable, TextRun as DocxTextRun } from "docx";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { buildPresentationSlides } from "../../../../lib/domain/aula-documentos/presentation";
import type { AulaImageAssetMap } from "../aula-documentos/export-images";

/** Resultado de una exportación Office. */
export type OfficeExportResult = {
  blob: Blob;
  warnings: string[];
};

type DocxModule = typeof import("docx");
type DocxChild = DocxParagraph | DocxTable;
type DocxRun = DocxTextRun | DocxHyperlink;

/**
 * Extrae el texto de un nodo Tiptap.
 * @param node - Nodo del documento.
 * @returns Texto plano concatenado.
 */
function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * Añade un aviso sin duplicarlo.
 * @param warnings - Lista de avisos.
 * @param warning - Aviso que se quiere añadir.
 */
function addWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}

/**
 * Convierte las marcas de un nodo de texto en opciones de `docx`.
 * @param node - Nodo de texto.
 * @returns Las opciones del run.
 */
function runOptions(node: JSONContent) {
  const marks = new Set((node.marks ?? []).map((mark) => mark.type));
  return {
    bold: marks.has("bold"),
    italics: marks.has("italic"),
    strike: marks.has("strike"),
    ...(marks.has("underline") ? { underline: {} } : {}),
    ...(marks.has("code") ? { font: "Consolas" } : {}),
  };
}

/**
 * Convierte el contenido inline de un nodo en runs de `docx`.
 * @param node - Nodo con contenido inline.
 * @param docx - Módulo cargado.
 * @returns Los runs listos para un párrafo.
 */
function inlineRuns(node: JSONContent, docx: DocxModule): DocxRun[] {
  const runs: DocxRun[] = [];
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") {
      runs.push(new docx.TextRun({ break: 1 }));
      continue;
    }
    if (child.type !== "text" || !child.text) continue;
    const options = runOptions(child);
    const link = (child.marks ?? []).find((mark) => mark.type === "link");
    const href = link?.attrs?.href;
    if (typeof href === "string") {
      runs.push(new docx.ExternalHyperlink({
        link: href,
        children: [new docx.TextRun({ text: child.text, ...options, style: "Hyperlink" })],
      }));
      continue;
    }
    runs.push(new docx.TextRun({ text: child.text, ...options }));
  }
  return runs;
}

/**
 * Convierte la alineación de un nodo en una alineación de `docx`.
 * @param node - Nodo del documento.
 * @param docx - Módulo cargado.
 * @returns La alineación o `undefined`.
 */
function alignment(node: JSONContent, docx: DocxModule) {
  const value = node.attrs?.textAlign;
  if (value === "center") return docx.AlignmentType.CENTER;
  if (value === "right") return docx.AlignmentType.RIGHT;
  if (value === "justify") return docx.AlignmentType.JUSTIFIED;
  if (value === "left") return docx.AlignmentType.LEFT;
  return undefined;
}

/**
 * Convierte una lista de Aula en párrafos de `docx`.
 * @param node - Lista.
 * @param ordered - Si es numerada.
 * @param level - Nivel de anidamiento.
 * @param docx - Módulo cargado.
 * @returns Los párrafos de la lista.
 */
function listParagraphs(node: JSONContent, ordered: boolean, level: number, docx: DocxModule): DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];
  for (const item of node.content ?? []) {
    const children = item.content ?? [];
    const first = children[0];
    if (first) {
      paragraphs.push(new docx.Paragraph({
        children: inlineRuns(first, docx),
        ...(ordered
          ? { numbering: { reference: "aula-numbering", level: Math.min(level, 3) } }
          : { bullet: { level: Math.min(level, 3) } }),
        spacing: { after: 60 },
      }));
    }
    for (const child of children.slice(1)) {
      if (child.type === "bulletList" || child.type === "orderedList") {
        paragraphs.push(...listParagraphs(child, child.type === "orderedList", level + 1, docx));
      } else if (child.type === "paragraph") {
        paragraphs.push(new docx.Paragraph({
          children: inlineRuns(child, docx),
          indent: { left: 720 * (level + 1) },
        }));
      }
    }
  }
  return paragraphs;
}

/**
 * Convierte una tabla de Aula en una tabla de `docx`.
 * @param node - Tabla.
 * @param docx - Módulo cargado.
 * @param warnings - Avisos de exportación.
 * @param images - Imágenes disponibles.
 * @returns La tabla.
 */
function tableToDocx(node: JSONContent, docx: DocxModule, warnings: string[], images: AulaImageAssetMap): DocxTable {
  const rows = (node.content ?? []).map((row) => {
    const cells = row.content ?? [];
    return new docx.TableRow({
      tableHeader: cells.some((cell) => cell.type === "tableHeader"),
      children: cells.map((cell) => {
        const colspan = Math.max(1, Number(cell.attrs?.colspan) || 1);
        const rowspan = Math.max(1, Number(cell.attrs?.rowspan) || 1);
        return new docx.TableCell({
          children: (cell.content ?? []).flatMap((child) => blockToDocx(child, docx, warnings, images)),
          ...(colspan > 1 ? { columnSpan: colspan } : {}),
          ...(rowspan > 1 ? { rowSpan: rowspan } : {}),
          ...(cell.type === "tableHeader"
            ? { shading: { type: docx.ShadingType.CLEAR, fill: "F1EFF8" } }
            : {}),
        });
      }),
    });
  });
  return new docx.Table({
    rows,
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
  });
}

/**
 * Convierte una lista de tareas en párrafos.
 * @param node - Lista de tareas.
 * @param docx - Módulo cargado.
 * @returns Los párrafos con casilla.
 */
function taskParagraphs(node: JSONContent, docx: DocxModule): DocxParagraph[] {
  return (node.content ?? []).map((item) => {
    const text = (item.content ?? []).map(nodeText).join(" ").trim();
    return new docx.Paragraph({
      children: [new docx.TextRun({ text: `${item.attrs?.checked === true ? "☑" : "☐"} ${text}` })],
      indent: { left: 360 },
    });
  });
}

/**
 * Convierte la alineación de una imagen en una alineación de `docx`.
 * @param node - Nodo de imagen.
 * @param docx - Módulo cargado.
 * @returns La alineación.
 */
function imageAlignment(node: JSONContent, docx: DocxModule) {
  const value = node.attrs?.alignment;
  if (value === "left") return docx.AlignmentType.LEFT;
  if (value === "right") return docx.AlignmentType.RIGHT;
  return docx.AlignmentType.CENTER;
}

/**
 * Convierte una imagen Aula en párrafos de `docx`.
 * @param node - Nodo de imagen.
 * @param docx - Módulo cargado.
 * @param warnings - Avisos de exportación.
 * @param images - Imágenes disponibles.
 * @returns El párrafo de imagen y su pie.
 */
function imageToDocx(
  node: JSONContent,
  docx: DocxModule,
  warnings: string[],
  images: AulaImageAssetMap,
): DocxChild[] {
  const source = typeof node.attrs?.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.trim() : "";
  const caption = typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";
  const asset = images.get(source);
  if (!alt) addWarning(warnings, "Una imagen no tiene texto alternativo.");

  if (!asset?.office) {
    addWarning(warnings, "Una imagen no se pudo incrustar en el DOCX.");
    return [new docx.Paragraph({
      children: [new docx.TextRun({
        text: alt ? `Imagen no disponible: ${alt}` : "Imagen no disponible",
        italics: true,
        color: "8A2F2F",
      })],
      spacing: { before: 120, after: 120 },
    })];
  }

  const office = asset.office;
  const type = office.mime === "image/jpeg" ? "jpg" : office.mime === "image/gif" ? "gif" : "png";
  const requestedWidth = Math.max(10, Math.min(100, Number(node.attrs?.width) || 100));
  let width = Math.round(560 * requestedWidth / 100);
  let height = Math.max(1, Math.round(width * office.height / Math.max(1, office.width)));
  const maxHeight = 720;
  if (height > maxHeight) {
    width = Math.max(1, Math.round(width * maxHeight / height));
    height = maxHeight;
  }

  const blocks: DocxChild[] = [new docx.Paragraph({
    children: [new docx.ImageRun({
      data: office.bytes,
      type,
      transformation: { width, height },
      altText: {
        name: alt || "Imagen del documento",
        description: alt || caption || "Imagen del documento",
        title: caption || alt || "Imagen",
      },
    })],
    alignment: imageAlignment(node, docx),
    spacing: { before: 120, after: caption ? 40 : 120 },
  })];

  if (caption) {
    blocks.push(new docx.Paragraph({
      children: [new docx.TextRun({ text: caption, italics: true, size: 18, color: "625C74" })],
      alignment: imageAlignment(node, docx),
      spacing: { after: 120 },
    }));
  }

  return blocks;
}

/**
 * Convierte un bloque Tiptap en elementos de `docx`.
 * @param node - Bloque del documento.
 * @param docx - Módulo cargado.
 * @param warnings - Avisos de exportación.
 * @param images - Imágenes disponibles.
 * @returns Los elementos del bloque.
 */
function blockToDocx(
  node: JSONContent,
  docx: DocxModule,
  warnings: string[],
  images: AulaImageAssetMap,
): DocxChild[] {
  if (node.type === "paragraph") {
    return [new docx.Paragraph({ children: inlineRuns(node, docx), alignment: alignment(node, docx) })];
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level) || 1;
    const heading = level === 1
      ? docx.HeadingLevel.HEADING_2
      : docx.HeadingLevel.HEADING_3;
    return [new docx.Paragraph({ children: inlineRuns(node, docx), heading, alignment: alignment(node, docx) })];
  }
  if (node.type === "bulletList") return listParagraphs(node, false, 0, docx);
  if (node.type === "orderedList") return listParagraphs(node, true, 0, docx);
  if (node.type === "taskList") return taskParagraphs(node, docx);
  if (node.type === "blockquote") {
    return (node.content ?? []).flatMap((child) => (
      blockToDocx(child, docx, warnings, images).map((item) => item)
    ));
  }
  if (node.type === "codeBlock" || node.type === "mermaidBlock") {
    if (node.type === "mermaidBlock") addWarning(warnings, "Los diagramas Mermaid se exportan como código.");
    const text = node.type === "mermaidBlock" ? String(node.attrs?.code ?? "") : nodeText(node);
    return [new docx.Paragraph({
      children: [new docx.TextRun({ text, font: "Consolas", size: 18 })],
      spacing: { before: 80, after: 80 },
    })];
  }
  if (node.type === "aulaImage") return imageToDocx(node, docx, warnings, images);
  if (node.type === "table") return [tableToDocx(node, docx, warnings, images)];
  if (node.type === "slideBreak") return [new docx.Paragraph({ children: [new docx.PageBreak()] })];
  if (node.type === "horizontalRule") return [new docx.Paragraph({ text: "" })];
  return (node.content ?? []).flatMap((child) => blockToDocx(child, docx, warnings, images));
}

/**
 * Exporta un documento Aula a DOCX.
 * @param document - Documento validado.
 * @param images - Imágenes resueltas para incrustar.
 * @returns El archivo y los avisos de fidelidad.
 */
export async function exportAulaDocx(
  document: AulaDocument,
  images: AulaImageAssetMap = new Map(),
): Promise<OfficeExportResult> {
  const docx = await import("docx");
  const warnings: string[] = [];
  let blocks = document.content.content ?? [];
  const title = document.title.trim() || "Documento sin título";
  const first = blocks[0];
  if (first?.type === "heading" && nodeText(first).trim() === title) blocks = blocks.slice(1);

  const numbering = {
    config: [{
      reference: "aula-numbering",
      levels: Array.from({ length: 4 }, (_, level) => ({
        level,
        format: docx.NumberFormat.DECIMAL,
        text: `%${level + 1}.`,
        alignment: docx.AlignmentType.START,
      })),
    }],
  };
  const doc = new docx.Document({
    creator: "Aula Documentos",
    title,
    numbering,
    sections: [{
      children: [
        new docx.Paragraph({ text: title, heading: docx.HeadingLevel.HEADING_1 }),
        ...blocks.flatMap((block) => blockToDocx(block, docx, warnings, images)),
      ],
    }],
  });
  return { blob: await docx.Packer.toBlob(doc), warnings };
}

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
      if (node.type === "heading" && nodeText(node).trim() === title) continue;
      if (node.type === "heading" || node.type === "paragraph") {
        const text = nodeText(node).trim();
        if (text) items.push({ kind: "text", text, bullet, heading: node.type === "heading" });
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        for (const item of node.content ?? []) visit(item.content ?? [], true);
      } else if (node.type === "taskList") {
        for (const item of node.content ?? []) {
          const text = (item.content ?? []).map(nodeText).join(" ").trim();
          if (text) items.push({ kind: "text", text, bullet: true, heading: false });
        }
      } else if (node.type === "table") {
        items.push({
          kind: "table",
          rows: (node.content ?? []).map((row) => (row.content ?? []).map((cell) => ({
            text: nodeText(cell),
            colspan: Math.max(1, Number(cell.attrs?.colspan) || 1),
            rowspan: Math.max(1, Number(cell.attrs?.rowspan) || 1),
            header: cell.type === "tableHeader",
          }))),
        });
      } else if (node.type === "codeBlock" || node.type === "mermaidBlock") {
        const text = node.type === "mermaidBlock" ? String(node.attrs?.code ?? "") : nodeText(node);
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
