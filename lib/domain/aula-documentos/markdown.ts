import type { JSONContent } from "@tiptap/core";
import { normalizeAulaLink, type AulaDocument } from "./document";
import { stripDuplicateTitleHeading } from "./title-heading";

/** Resultado de convertir Markdown al modelo del documento. */
export type MarkdownDocumentResult = {
  title: string;
  content: JSONContent;
  warnings: string[];
};

/** Límite de entrada para Markdown. */
export const AULA_DOCUMENT_MARKDOWN_MAX_LENGTH = 200_000;

/** Opciones de conversión. */
export type MarkdownDocumentOptions = {
  /** Convierte `---` en saltos de diapositiva en vez de reglas horizontales. */
  slideBreaks?: boolean;
  /** Título cuando no hay un encabezado utilizable. */
  titleFallback?: string;
  /** Quita el primer encabezado cuando se usa como título del documento. */
  stripTitleHeading?: boolean;
};

const INLINE_PATTERN = /(\*\*\*[^*]+\*\*\*|~~[^~]+~~|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

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
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      nodes.push({ type: "text", text: part.slice(3, -3), marks: [{ type: "bold" }, { type: "italic" }] });
      continue;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] });
      continue;
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      nodes.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "strike" }] });
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
 * Divide una fila de tabla Markdown en celdas.
 * @param line - Línea con pipes.
 * @returns Las celdas recortadas.
 */
function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

/**
 * Indica si una línea es el separador de una tabla GFM.
 * @param line - Línea candidata.
 * @returns `true` si todas sus celdas son separadores.
 */
function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * Convierte una tabla GFM en nodos Tiptap.
 * @param header - Celdas de cabecera.
 * @param rows - Filas de datos.
 * @returns El nodo de tabla.
 */
function tableNode(header: string[], rows: string[][]): JSONContent {
  const width = Math.max(header.length, ...rows.map((row) => row.length), 1);
  const cell = (text: string, type: "tableHeader" | "tableCell"): JSONContent => ({
    type,
    content: [paragraph(text)],
  });
  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: Array.from({ length: width }, (_, column) => cell(header[column] ?? "", "tableHeader")),
      },
      ...rows.map((row) => ({
        type: "tableRow",
        content: Array.from({ length: width }, (_, column) => cell(row[column] ?? "", "tableCell")),
      })),
    ],
  };
}

/**
 * Convierte un nodo de tabla a Markdown GFM.
 * @param node - Nodo de tabla.
 * @returns Markdown de la tabla.
 */
function tableToMarkdown(node: JSONContent): string {
  const rows = node.content ?? [];
  const cells = (row: JSONContent): string[] => (row.content ?? []).map((cell) => (
    nodeText(cell).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()
  ));
  const header = rows[0] ? cells(rows[0]) : [];
  const width = Math.max(header.length, ...rows.slice(1).map((row) => cells(row).length), 1);
  const line = (values: string[]) => `| ${Array.from({ length: width }, (_, index) => values[index] ?? "").join(" | ")} |`;
  return [
    line(header),
    line(Array.from({ length: width }, () => "---")),
    ...rows.slice(1).map((row) => line(cells(row))),
  ].join("\n");
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
    || line.startsWith("|")
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

    if (line.startsWith("|") && isTableSeparator(lines[index + 1]?.trim() ?? "")) {
      const header = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index].trim()));
        index += 1;
      }
      blocks.push(tableNode(header, rows));
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

    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: JSONContent[] = [];
      while (index < lines.length) {
        const item = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[index].trim());
        if (!item) break;
        const content = markdownInlineToNodes(item[2]);
        items.push({
          type: "taskItem",
          attrs: { checked: item[1].toLowerCase() === "x" },
          content: [{ type: "paragraph", ...(content.length ? { content } : {}) }],
        });
        index += 1;
      }
      blocks.push({ type: "taskList", content: items });
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
  let contentBlocks = blocks;
  if (options.stripTitleHeading) {
    const stripped = stripDuplicateTitleHeading({ type: "doc", content: blocks }, title);
    if (stripped.removed) {
      contentBlocks = stripped.content.content ?? [];
      if (stripped.warning) warnings.push(stripped.warning);
    }
  }

  return {
    title: title || options.titleFallback || "Documento importado",
    content: {
      type: "doc",
      content: contentBlocks.length ? contentBlocks : [{ type: "paragraph" }],
    },
    warnings,
  };
}

/**
 * Escapa el texto que no debe interpretarse como Markdown.
 * @param value - Texto plano.
 * @returns Texto seguro para el subconjunto.
 */
function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_[\]])/g, "\\$1");
}

/**
 * Convierte nodos inline a Markdown.
 * @param nodes - Texto con marcas.
 * @returns Markdown inline.
 */
function inlineToMarkdown(nodes: JSONContent[]): string {
  return nodes.map((node) => {
    if (node.type === "hardBreak") return "  \n";
    if (node.type !== "text") return "";
    const text = node.text ?? "";
    const marks = new Set((node.marks ?? []).map((mark) => mark.type));
    const link = (node.marks ?? []).find((mark) => mark.type === "link");
    if (link?.attrs?.href) {
      return `[${escapeMarkdownText(text)}](${link.attrs.href})`;
    }
    if (marks.has("code")) return `\`${text.replace(/`/g, "\\`")}\``;
    const bold = marks.has("bold");
    const italic = marks.has("italic");
    if (bold && italic) return `***${escapeMarkdownText(text)}***`;
    if (bold) return `**${escapeMarkdownText(text)}**`;
    if (italic) return `*${escapeMarkdownText(text)}*`;
    if (marks.has("strike")) return `~~${escapeMarkdownText(text)}~~`;
    return escapeMarkdownText(text);
  }).join("");
}

/**
 * Convierte una lista a Markdown.
 * @param node - Nodo de lista.
 * @param ordered - Si la lista es numerada.
 * @returns Markdown de la lista.
 */
function listToMarkdown(node: JSONContent, ordered: boolean): string {
  return (node.content ?? []).map((item, index) => {
    const body = (item.content ?? []).map((child) => blockToMarkdown(child)).join("\n\n");
    const marker = ordered ? `${index + 1}. ` : "- ";
    return body.split("\n").map((line, lineIndex) => (
      lineIndex === 0 ? `${marker}${line}` : `${" ".repeat(marker.length)}${line}`
    )).join("\n");
  }).join("\n");
}

/**
 * Convierte una lista de tareas a Markdown.
 * @param node - Nodo de lista de tareas.
 * @returns Markdown con casillas.
 */
function taskListToMarkdown(node: JSONContent): string {
  return (node.content ?? []).map((item) => {
    const body = (item.content ?? []).map((child) => blockToMarkdown(child)).join("\n\n");
    const marker = item.attrs?.checked === true ? "- [x] " : "- [ ] ";
    return body.split("\n").map((line, lineIndex) => (
      lineIndex === 0 ? `${marker}${line}` : `${" ".repeat(marker.length)}${line}`
    )).join("\n");
  }).join("\n");
}

/**
 * Convierte un nodo de bloque a Markdown.
 * @param node - Nodo del documento.
 * @returns Markdown del bloque.
 */
function blockToMarkdown(node: JSONContent): string {
  if (node.type === "paragraph") return inlineToMarkdown(node.content ?? []);
  if (node.type === "heading") {
    const level = Number(node.attrs?.level) || 1;
    return `${"#".repeat(Math.max(1, Math.min(3, level)))} ${inlineToMarkdown(node.content ?? [])}`;
  }
  if (node.type === "bulletList") return listToMarkdown(node, false);
  if (node.type === "orderedList") return listToMarkdown(node, true);
  if (node.type === "taskList") return taskListToMarkdown(node);
  if (node.type === "blockquote") {
    return (node.content ?? [])
      .map((child) => blockToMarkdown(child))
      .join("\n\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (node.type === "codeBlock") {
    const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
    return `\`\`\`${language}\n${nodeText(node)}\n\`\`\``;
  }
  if (node.type === "mermaidBlock") {
    const code = typeof node.attrs?.code === "string" ? node.attrs.code : "";
    return `\`\`\`mermaid\n${code}\n\`\`\``;
  }
  if (node.type === "table") return tableToMarkdown(node);
  if (node.type === "slideBreak" || node.type === "horizontalRule") return "---";
  return (node.content ?? []).map((child) => blockToMarkdown(child)).join("\n\n");
}

/**
 * Exporta el documento al subconjunto Markdown soportado.
 * @param aulaDocument - Documento validado.
 * @returns Markdown con título, contenido y diagramas cercados.
 */
export function documentToMarkdown(aulaDocument: AulaDocument): string {
  const title = aulaDocument.title.trim() || "Documento sin título";
  const blocks = [...(aulaDocument.content.content ?? [])];
  const first = blocks[0];
  if (first?.type === "heading" && nodeText(first).trim() === title) blocks.shift();
  const body = blocks.map((block) => blockToMarkdown(block)).filter(Boolean).join("\n\n");
  return `# ${escapeMarkdownText(title)}${body ? `\n\n${body}` : ""}\n`;
}
