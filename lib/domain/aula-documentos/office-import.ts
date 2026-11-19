import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  parseAulaDocument,
} from "./document";
import type { AulaDocumentImportPreview } from "./importers";
import {
  AULA_DOCUMENT_MARKDOWN_MAX_LENGTH,
  markdownToDocument,
} from "./markdown";

/** Formatos Office que se convierten en documento Aula. */
export type OfficeImportFormat = "docx" | "pptx";

/** Markdown extraído de un archivo Office antes de convertirlo. */
export type OfficeMarkdownInput = {
  markdown: string;
  format: OfficeImportFormat;
  fileName: string;
};

/** Resultado de convertir el Markdown de Office a documento Aula. */
export type OfficeDocumentImportResult =
  | { ok: true; preview: AulaDocumentImportPreview }
  | { ok: false; message: string };

const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)/g;
const SPEAKER_NOTES_PATTERN = /\n#{1,3}\s+(?:Speaker notes|Notas del orador)\s*\n[\s\S]*?(?=\n(?:---|#{1,3}\s)|\s*$)/gi;

type ContentNode = { type?: string; text?: string; content?: ContentNode[] };

/**
 * Extrae el texto de un nodo Tiptap.
 * @param node - Nodo del documento.
 * @returns Texto plano concatenado.
 */
function nodeText(node: ContentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * Indica si el título es el marcador genérico de una diapositiva.
 * @param title - Título del documento.
 * @returns `true` si parece «Slide 1» o similar.
 */
function isSlidePlaceholder(title: string): boolean {
  return /^(?:slide|diapositiva)\s+\d+$/i.test(title.trim());
}

/**
 * Busca el primer párrafo con texto del documento.
 * @param nodes - Bloques del documento.
 * @returns El texto del primer párrafo no vacío.
 */
function firstParagraphText(nodes: ContentNode[]): string {
  for (const node of nodes) {
    if (node.type === "paragraph") {
      const text = nodeText(node).trim();
      if (text) return text;
    }
  }
  return "";
}

/**
 * Convierte el Markdown de Office en una vista previa de Aula Documentos.
 * @param input - Markdown extraído, formato y nombre del archivo.
 * @returns La vista previa lista para confirmar o un error legible.
 */
export function officeMarkdownToPreview(input: OfficeMarkdownInput): OfficeDocumentImportResult {
  if (!input.markdown.trim()) {
    return { ok: false, message: "El archivo de Office no contiene texto importable." };
  }
  if (input.markdown.length > AULA_DOCUMENT_MARKDOWN_MAX_LENGTH) {
    return { ok: false, message: "El texto del archivo de Office supera el tamaño permitido." };
  }

  const warnings: string[] = [
    "La importación conserva texto y estructura básica; la maquetación visual, las columnas y los elementos avanzados pueden cambiar.",
  ];
  if (input.format === "pptx") {
    warnings.push("Las diapositivas se convierten en secciones separadas por saltos de diapositiva.");
  }

  let markdown = input.markdown.replace(/\r\n/g, "\n");
  const images = markdown.match(IMAGE_PATTERN)?.length ?? 0;
  if (images) {
    markdown = markdown.replace(IMAGE_PATTERN, "").replace(/\n{3,}/g, "\n\n");
    warnings.push(images === 1 ? "Se ha omitido una imagen." : `Se han omitido ${images} imágenes.`);
  }
  if (input.format === "pptx") {
    const notes = markdown.match(SPEAKER_NOTES_PATTERN)?.length ?? 0;
    if (notes) {
      markdown = markdown.replace(SPEAKER_NOTES_PATTERN, "").replace(/\n{3,}/g, "\n\n");
      warnings.push("Se han omitido las notas del orador.");
    }
  }

  const titleFallback = input.fileName.replace(/\.[^.]+$/, "").trim() || "Documento de Office";
  const converted = markdownToDocument(markdown, {
    slideBreaks: input.format === "pptx",
    stripTitleHeading: true,
    titleFallback,
  });
  const parsed = parseAulaDocument({
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: converted.title,
    content: converted.content,
  });
  if (!parsed.ok) {
    return { ok: false, message: `No se pudo convertir el archivo de Office: ${parsed.message}` };
  }

  const blocks = (parsed.document.content.content ?? []) as ContentNode[];
  const usefulBlocks = input.format === "pptx"
    ? blocks.filter((node) => !(node.type === "heading" && isSlidePlaceholder(nodeText(node))))
    : blocks;
  const title = input.format === "pptx" && isSlidePlaceholder(parsed.document.title)
    ? firstParagraphText(usefulBlocks) || titleFallback
    : parsed.document.title;
  const first = usefulBlocks[0];
  let content = first?.type === "paragraph" && nodeText(first).trim() === title.trim()
    ? usefulBlocks.slice(1)
    : usefulBlocks;
  if (!content.length) content = [{ type: "paragraph" }];

  const finalDocument = parseAulaDocument({
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title: title.slice(0, 120),
    content: {
      type: "doc",
      content,
    },
  });
  if (!finalDocument.ok) {
    return { ok: false, message: `No se pudo convertir el archivo de Office: ${finalDocument.message}` };
  }

  return {
    ok: true,
    preview: {
      source: "office",
      document: finalDocument.document,
      stats: finalDocument.stats,
      warnings: [...warnings, ...converted.warnings],
    },
  };
}
