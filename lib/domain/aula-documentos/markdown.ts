import type { JSONContent } from "@tiptap/core";
import { normalizeAulaLink } from "./document";

/** Resultado de convertir Markdown al modelo del documento. */
export type MarkdownDocumentResult = {
  title: string;
  content: JSONContent;
  warnings: string[];
};

/** Opciones de conversión. */
export type MarkdownDocumentOptions = {
  /** Convierte `---` en saltos de diapositiva en vez de reglas horizontales. */
  slideBreaks?: boolean;
  /** Título cuando no hay un encabezado utilizable. */
  titleFallback?: string;
};

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/**
 * Convierte Markdown inline en nodos de texto seguros.
 * @param text - Texto de un párrafo, título o elemento de lista.
 * @returns Nodos de texto con marcas admitidas.
 */
export function markdownInlineToNodes(text: string): JSONContent[] {
  if (!text) return [];
  const parts = text.split(INLINE_PATTERN).filter(Boolean);
  const nodes: JSONContent[] = [];

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] });
      continue;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "italic" }] });
      continue;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      nodes.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "code" }] });
      continue;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = normalizeAulaLink(link[2]);
      if (href) {
        nodes.push({
          type: "text",
          text: link[1],
          marks: [{
            type: "link",
            attrs: {
              href,
              target: "_blank",
              rel: "noopener noreferrer nofollow",
            },
          }],
        });
        continue;
      }
    }

    nodes.push({ type: "text", text: part });
  }

  return nodes;
}

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
 * Indica si una línea empieza un bloque distinto de un párrafo.
 * @param line - Línea ya recortada.
 * @returns `true` si no debe continuar el párrafo.
 */
function startsBlock(line: string): boolean {
  return /^(#{1,3})\s+/.test(line)
    || line.startsWith("```")
    || line.startsWith("> ")
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || line === "---";
}

/**
 * Construye un párrafo con marcas inline.
 * @param text - Texto del párrafo.
 * @returns Nodo de párrafo.
 */
function paragraph(text: string): JSONContent {
  const content = markdownInlineToNodes(text);
  return { type: "paragraph", ...(content.length ? { content } : {}) };
}

/**
 * Convierte el Markdown de una diapositiva en bloques.
 * @param source - Markdown de una sección.
 * @param warnings - Lista compartida de avisos.
 * @returns Bloques Tiptap.
 */
function parseBlocks(source: string, warnings: string[]): JSONContent[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSONContent[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim().toLowerCase();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) warnings.push("Un bloque de código no tenía cierre.");
      index += 1;
      const value = code.join("\n");
      if (language === "mermaid") {
        blocks.push({ type: "mermaidBlock", attrs: { code: value } });
      } else {
        blocks.push({
          type: "codeBlock",
          ...(language ? { attrs: { language } } : {}),
          content: value ? [{ type: "text", text: value }] : [],
        });
      }
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const content = markdownInlineToNodes(heading[2].trim());
      blocks.push({
        type: "heading",
        attrs: { level: heading[1].length },
        ...(content.length ? { content } : {}),
      });
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quote.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({
        type: "blockquote",
        content: [paragraph(quote.join(" "))],
      });
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const itemPattern = ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/;
      const items: JSONContent[] = [];
      while (index < lines.length) {
        const item = itemPattern.exec(lines[index].trim());
        if (!item) break;
        const content = markdownInlineToNodes(item[1]);
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", ...(content.length ? { content } : {}) }],
        });
        index += 1;
      }
      blocks.push({
        type: ordered ? "orderedList" : "bulletList",
        attrs: ordered ? { start: 1 } : undefined,
        content: items,
      });
      continue;
    }

    if (line === "---") {
      blocks.push({ type: "horizontalRule" });
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || startsBlock(next)) break;
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push(paragraph(paragraphLines.join(" ")));
  }

  return blocks;
}

/**
 * Convierte Markdown al contenido de Aula Documentos.
 * @param markdown - Markdown de una presentación o documento.
 * @param options - Saltos de diapositiva y título de reserva.
 * @returns Título, contenido y avisos de conversión.
 */
export function markdownToDocument(
  markdown: string,
  options: MarkdownDocumentOptions = {},
): MarkdownDocumentResult {
  const warnings: string[] = [];
  const normalized = markdown.replace(/\r\n/g, "\n");
  const sections = options.slideBreaks
    ? normalized.split(/\n\s*---\s*\n/)
    : [normalized];
  const blocks: JSONContent[] = [];

  sections.forEach((section, sectionIndex) => {
    if (options.slideBreaks && sectionIndex > 0) {
      blocks.push({ type: "slideBreak" });
    }
    blocks.push(...parseBlocks(section, warnings));
  });

  const firstHeading = blocks.find((block) => block.type === "heading");
  const firstParagraph = blocks.find((block) => block.type === "paragraph");
  const title = firstHeading
    ? nodeText(firstHeading).trim().slice(0, 120)
    : firstParagraph
      ? nodeText(firstParagraph).trim().slice(0, 120)
      : options.titleFallback ?? "Documento importado";

  return {
    title: title || options.titleFallback || "Documento importado",
    content: {
      type: "doc",
      content: blocks.length ? blocks : [{ type: "paragraph" }],
    },
    warnings,
  };
}
