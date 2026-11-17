/** Texto con formato inline seguro. */
export type InlineSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string;
};

/** Bloque de contenido de una diapositiva. */
export type SlideBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string };

/** Diapositiva preparada para la vista previa y reveal.js. */
export type PresentationSlide = {
  title: string;
  blocks: SlideBlock[];
};

/** Documento inicial de la app. */
export const DEFAULT_MARKDOWN = `# Nuestra presentación

Una idea clara para empezar.

---

## Primera idea

- Punto de partida
- Lo que queremos contar
- Lo que queremos cambiar

---

## Para terminar

Gracias por escuchar.
`;

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

/**
 * Convierte Markdown inline en fragmentos seguros.
 * @param text - Texto de un bloque.
 * @returns Fragmentos con negrita, cursiva, código o enlace.
 */
export function parseInline(text: string): InlineSegment[] {
  return text.split(INLINE_PATTERN).filter(Boolean).map((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return { text: part.slice(2, -2), bold: true };
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return { text: part.slice(1, -1), italic: true };
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return { text: part.slice(1, -1), code: true };
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && /^(https?:\/\/|mailto:)/i.test(link[2])) {
      return { text: link[1], href: link[2] };
    }
    return { text: part };
  });
}

/**
 * Divide el documento en diapositivas por líneas con `---`.
 * @param markdown - Documento completo del editor.
 * @returns Diapositivas con sus bloques.
 */
export function parseSlides(markdown: string): PresentationSlide[] {
  const chunks = markdown.split(/\n\s*---\s*\n/);
  const slides = chunks.map((chunk, index) => {
    const blocks = parseBlocks(chunk);
    return {
      title: firstTitle(blocks) ?? `Diapositiva ${index + 1}`,
      blocks,
    };
  });
  return slides.length ? slides : [{ title: "Diapositiva 1", blocks: [] }];
}

/**
 * Convierte el texto de una diapositiva en bloques.
 * @param source - Markdown de una diapositiva.
 * @returns Bloques de título, párrafo, lista, cita o código.
 */
function parseBlocks(source: string): SlideBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: SlideBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
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
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      const itemPattern = ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/;
      while (index < lines.length) {
        const item = itemPattern.exec(lines[index].trim());
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || /^(#{1,3})\s+/.test(next) || next.startsWith("> ") || /^[-*]\s+/.test(next) || /^\d+\.\s+/.test(next) || next.startsWith("```")) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

/**
 * Extrae el primer texto visible para el título de la diapositiva.
 * @param blocks - Bloques de una diapositiva.
 * @returns Título corto o `null`.
 */
function firstTitle(blocks: SlideBlock[]): string | null {
  const heading = blocks.find((block) => block.type === "heading");
  if (heading?.type === "heading") return heading.text;
  const paragraph = blocks.find((block) => block.type === "paragraph");
  if (paragraph?.type === "paragraph") return paragraph.text.slice(0, 80);
  return null;
}
