import type { JSONContent } from "@tiptap/core";

/** Longitud máxima del título de una nota. */
export const NOTE_TITLE_MAX_LENGTH = 120;

/** Límites defensivos para documentos guardados. */
export const NOTE_JSON_MAX_LENGTH = 180_000;
export const NOTE_MAX_NODES = 3_000;
export const NOTE_MAX_DEPTH = 24;
export const NOTE_TEXT_MAX_LENGTH = 100_000;

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link"]);

/** Documento serializable de Notas y documentos. */
export type NotesDocument = {
  title: string;
  content: JSONContent;
};

/** Documento de ejemplo con los formatos disponibles. */
export const STARTER_DOCUMENT: NotesDocument = {
  title: "Ideas para la semana",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Esta es una " },
          { type: "text", marks: [{ type: "bold" }], text: "nota compartida" },
          {
            type: "text",
            text: " del proyecto. Selecciona texto y usa la barra para darle formato, o escribe directamente.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Plan de trabajo" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Preparar el material de la próxima clase." }],
            }],
          },
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Revisar las dudas del equipo." }],
            }],
          },
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Dejar una conclusión escrita." }],
            }],
          },
        ],
      },
      {
        type: "blockquote",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Una nota clara se entiende sin tener que preguntar de nuevo." }],
        }],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Enlaces y código" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Puedes enlazar una " },
          {
            type: "text",
            marks: [{
              type: "link",
              attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer nofollow" },
            }],
            text: "fuente fiable",
          },
          { type: "text", text: " o guardar una idea como código." },
        ],
      },
      {
        type: "codeBlock",
        content: [{ type: "text", text: "const idea = \"Escribir, guardar y compartir\";" }],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Recordatorio" }],
      },
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Guardar antes de cerrar la ventana." }],
            }],
          },
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Compartir solo con las personas del proyecto." }],
            }],
          },
        ],
      },
    ],
  },
};

/**
 * Crea una copia independiente del documento de ejemplo.
 * @returns Título y contenido listos para el editor.
 */
export function createStarterDocument(): NotesDocument {
  return {
    title: STARTER_DOCUMENT.title,
    content: structuredClone(STARTER_DOCUMENT.content),
  };
}

/**
 * Normaliza un enlace para que solo use protocolos seguros.
 * @param value - Texto escrito por la persona.
 * @returns El enlace normalizado o `null` si no es válido.
 */
export function normalizeLinkUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^(javascript|data|vbscript|file):/i.test(text)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
      ? `mailto:${text}`
      : `https://${text}`;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Cuenta palabras separadas por espacios en el texto del editor.
 * @param text - Texto plano generado por Tiptap.
 * @returns Número de palabras.
 */
export function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
}

type ValidationContext = {
  nodes: number;
};

/**
 * Valida las marcas de un nodo de texto y descarta las no soportadas.
 * @param value - Lista de marcas candidata.
 * @returns Marcas normalizadas o `null` si la forma no es válida.
 */
function normalizeMarks(value: unknown): NonNullable<JSONContent["marks"]> | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) return null;

  const marks: NonNullable<JSONContent["marks"]> = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const mark = entry as Record<string, unknown>;
    if (typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type) || seen.has(mark.type)) continue;
    seen.add(mark.type);

    if (mark.type !== "link") {
      marks.push({ type: mark.type });
      continue;
    }

    if (typeof mark.attrs !== "object" || mark.attrs === null) continue;
    const href = (mark.attrs as Record<string, unknown>).href;
    if (typeof href !== "string") continue;
    const safeHref = normalizeLinkUrl(href);
    if (!safeHref) continue;
    marks.push({
      type: "link",
      attrs: {
        href: safeHref,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    });
  }
  return marks;
}

/**
 * Normaliza un nodo del documento y descarta nodos no permitidos.
 * @param value - Nodo candidato.
 * @param context - Contador compartido de nodos.
 * @param depth - Profundidad actual.
 * @returns El nodo validado o `null` si no es seguro.
 */
function normalizeNode(value: unknown, context: ValidationContext, depth: number): JSONContent | null {
  if (depth > NOTE_MAX_DEPTH || typeof value !== "object" || value === null || Array.isArray(value)) return null;
  context.nodes += 1;
  if (context.nodes > NOTE_MAX_NODES) return null;

  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string" || !ALLOWED_NODES.has(node.type)) return null;

  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length > NOTE_TEXT_MAX_LENGTH) return null;
    const marks = normalizeMarks(node.marks);
    if (marks === null) return null;
    return {
      type: "text",
      text: node.text,
      ...(marks.length ? { marks } : {}),
    };
  }

  if (node.type === "hardBreak" || node.type === "horizontalRule") {
    return { type: node.type };
  }

  if (node.type === "doc" && depth !== 0) return null;

  const content = normalizeContent(node.content, context, depth);
  if (content === null) return null;

  if (node.type === "heading") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const level = attrs.level;
    if (level !== 1 && level !== 2 && level !== 3) return null;
    return { type: "heading", attrs: { level }, content };
  }

  if (node.type === "codeBlock") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const language = typeof attrs.language === "string" ? attrs.language.trim().slice(0, 30) : "";
    return {
      type: "codeBlock",
      ...(language ? { attrs: { language } } : {}),
      content,
    };
  }

  if (node.type === "orderedList") {
    const attrs = typeof node.attrs === "object" && node.attrs !== null
      ? node.attrs as Record<string, unknown>
      : {};
    const start = Number.isInteger(attrs.start) && Number(attrs.start) >= 1 && Number(attrs.start) <= 100_000
      ? Number(attrs.start)
      : 1;
    return { type: "orderedList", attrs: { start }, content };
  }

  return { type: node.type, content };
}

/**
 * Valida los hijos de un nodo.
 * @param value - Contenido candidato.
 * @param context - Contador compartido de nodos.
 * @param depth - Profundidad del padre.
 * @returns Los hijos normalizados o `null` si la forma no es válida.
 */
function normalizeContent(value: unknown, context: ValidationContext, depth: number): JSONContent[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 1_000) return null;
  const content: JSONContent[] = [];
  for (const child of value) {
    const normalized = normalizeNode(child, context, depth + 1);
    if (!normalized) return null;
    content.push(normalized);
  }
  return content;
}

/**
 * Valida y normaliza un documento leído de `app_documents`.
 * @param value - Valor candidato.
 * @returns El documento seguro o `null` si no se puede recuperar.
 */
export function parseNotesDocument(value: unknown): NotesDocument | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  try {
    if (JSON.stringify(value).length > NOTE_JSON_MAX_LENGTH) return null;
  } catch {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== "string") return null;
  const title = candidate.title.trim();
  if (title.length > NOTE_TITLE_MAX_LENGTH) return null;

  const context: ValidationContext = { nodes: 0 };
  const content = normalizeNode(candidate.content, context, 0);
  if (!content || content.type !== "doc") return null;

  return { title, content };
}
