import type { JSONContent } from "@tiptap/core";

/** Longitud máxima del título de una nota. */
export const NOTE_TITLE_MAX_LENGTH = 120;

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
