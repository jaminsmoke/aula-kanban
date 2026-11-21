import type { JSONContent } from "@tiptap/core";
import { contentInlineText } from "./text";

/** Texto del aviso cuando se retira un H1 duplicado. */
export const DUPLICATE_TITLE_WARNING = "Se quitó el H1 inicial porque repetía el título.";

/**
 * Normaliza un título para compararlo sin depender de mayúsculas, acentos o espacios.
 * @param value - Texto del título o del encabezado.
 * @returns Texto comparable.
 */
export function normalizeAulaTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retira el primer H1 cuando repite el título del documento.
 * @param content - Contenido raíz del documento.
 * @param title - Título final del documento.
 * @returns El contenido normalizado, si se retiró y el aviso correspondiente.
 */
export function stripDuplicateTitleHeading(content: JSONContent, title: string): {
  content: JSONContent;
  removed: boolean;
  warning: string | null;
} {
  const blocks = content.content ?? [];
  const first = blocks[0];
  if (first?.type !== "heading" || first.attrs?.level !== 1) {
    return { content, removed: false, warning: null };
  }
  if (normalizeAulaTitle(contentInlineText(first)) !== normalizeAulaTitle(title)) {
    return { content, removed: false, warning: null };
  }

  const next = blocks.slice(1);
  return {
    content: {
      ...content,
      content: next.length ? next : [{ type: "paragraph" }],
    },
    removed: true,
    warning: DUPLICATE_TITLE_WARNING,
  };
}
