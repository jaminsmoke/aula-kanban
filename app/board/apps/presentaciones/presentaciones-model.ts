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

/** Documento que se guarda en `app_documents`. */
export type PresentationDocument = {
  markdown: string;
};

/** Plantillas disponibles. */
export type PresetId = "clase" | "proyecto" | "blanco";

/** Ficha visible de una plantilla. */
export type PresetInfo = {
  id: PresetId;
  label: string;
  description: string;
  markdown: string;
};

/** Límite defensivo del documento. */
export const MAX_MARKDOWN_LENGTH = 200_000;

/** Plantillas en el orden del selector. */
export const PRESETS: PresetInfo[] = [
  {
    id: "clase",
    label: "Clase",
    description: "Una presentación breve con introducción, ideas y cierre.",
    markdown: DEFAULT_MARKDOWN,
  },
  {
    id: "proyecto",
    label: "Proyecto",
    description: "Objetivos, pasos y resultado para presentar un proyecto.",
    markdown: `# Presentación del proyecto

## Qué vamos a contar

- El problema que hemos elegido
- Por qué nos importa
- Qué queremos conseguir

---

## Nuestro plan

1. Investigar
2. Diseñar una solución
3. Probarla y mejorarla

---

## Resultado

**Gracias por escuchar.**

---

## Preguntas

¿Qué queréis saber?
`,
  },
  {
    id: "blanco",
    label: "En blanco",
    description: "Una diapositiva vacía para empezar desde cero.",
    markdown: "# Nueva presentación\n",
  },
];

/**
 * Ficha de una plantilla.
 * @param id - Identificador de la plantilla.
 * @returns La ficha correspondiente o la primera.
 */
export function presetInfo(id: PresetId): PresetInfo {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

/**
 * Serializa el editor para `app_documents`.
 * @param markdown - Documento actual.
 * @returns El estado JSON que se guarda.
 */
export function serializePresentation(markdown: string): PresentationDocument {
  return { markdown };
}

/**
 * Valida y normaliza un documento guardado.
 * @param value - Valor leído de `app_documents`.
 * @returns El documento o `null` si no es válido.
 */
export function parsePresentationDocument(value: unknown): PresentationDocument | null {
  if (!value || typeof value !== "object") return null;
  const markdown = (value as { markdown?: unknown }).markdown;
  if (typeof markdown !== "string" || markdown.length > MAX_MARKDOWN_LENGTH) return null;
  return { markdown };
}

/**
 * Genera una presentación HTML autónoma y sin red.
 * @param markdown - Documento actual.
 * @returns El HTML completo que se descarga.
 */
export function exportPresentationHtml(markdown: string): string {
  const slides = parseSlides(markdown);
  const sections = slides.map((slide, index) => (
    `<section class="slide${index === 0 ? " active" : ""}" data-slide="${index}">${blocksToHtml(slide.blocks)}</section>`
  )).join("\n");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentación</title>
<style>
:root{font-family:Georgia,serif;color:#1c2a5a;background:#f6f7fb}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
.deck{width:min(960px,100%);aspect-ratio:16/9;position:relative;background:#fff;border:1px solid #d8dcec;border-radius:18px;box-shadow:0 18px 50px #1c2a5a1a;overflow:hidden}
.slide{display:none;height:100%;padding:9%;overflow:auto}
.slide.active{display:block}
h1{font-size:2.4rem;line-height:1.1;margin:0 0 .4em}
h2{font-size:1.8rem;line-height:1.15;margin:0 0 .4em}
h3{font-size:1.3rem;margin:0 0 .4em}
p,li{font-size:1.05rem;line-height:1.55}
blockquote{border-left:3px solid #5b45b8;padding-left:1rem;color:#4b5f96}
pre{background:#f2f4fb;padding:1rem;border-radius:8px;overflow:auto}
code{font-family:ui-monospace,monospace}
nav{position:fixed;bottom:18px;right:18px;display:flex;gap:8px}
button{font:inherit;padding:6px 12px;border:1px solid #b9c0d8;border-radius:8px;background:#fff;color:#1c2a5a;cursor:pointer}
</style>
</head>
<body>
<main class="deck">${sections}</main>
<nav><button type="button" data-direction="previous">Anterior</button><button type="button" data-direction="next">Siguiente</button></nav>
<script>
let current = 0;
const slides = Array.from(document.querySelectorAll('.slide'));
function show(index) {
  current = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === ' ') show(current + 1);
  if (event.key === 'ArrowLeft') show(current - 1);
});
document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => show(current + (button.dataset.direction === 'next' ? 1 : -1)));
});
show(0);
</script>
</body>
</html>`;
}

/**
 * Convierte bloques a HTML escapado.
 * @param blocks - Bloques de una diapositiva.
 * @returns El HTML de esos bloques.
 */
function blocksToHtml(blocks: SlideBlock[]): string {
  return blocks.map((block) => {
    if (block.type === "heading") return `<h${block.level}>${inlineToHtml(block.text)}</h${block.level}>`;
    if (block.type === "list") {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join("")}</${tag}>`;
    }
    if (block.type === "quote") return `<blockquote>${inlineToHtml(block.text)}</blockquote>`;
    if (block.type === "code") return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    return `<p>${inlineToHtml(block.text)}</p>`;
  }).join("\n");
}

/**
 * Convierte fragmentos inline a HTML escapado.
 * @param text - Texto de un bloque.
 * @returns HTML con marcas seguras.
 */
function inlineToHtml(text: string): string {
  return parseInline(text).map((segment) => {
    const safe = escapeHtml(segment.text);
    if (segment.href) return `<a href="${escapeHtml(segment.href)}" rel="noreferrer noopener">${safe}</a>`;
    if (segment.code) return `<code>${safe}</code>`;
    if (segment.bold) return `<strong>${safe}</strong>`;
    if (segment.italic) return `<em>${safe}</em>`;
    return safe;
  }).join("");
}

/**
 * Escapa texto para insertarlo en HTML.
 * @param value - Texto sin escapar.
 * @returns Texto seguro para HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
