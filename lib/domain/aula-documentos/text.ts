/**
 * Cuenta palabras de un texto.
 * @param text - Texto plano.
 * @returns Número de palabras.
 */
export function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
}

/**
 * Extrae el texto visible de un nodo Tiptap conservando la unión de marcas.
 * No introduce espacios entre nodos inline, a diferencia de `contentText`.
 * @param value - Nodo candidato.
 * @returns Texto plano concatenado.
 */
export function contentInlineText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text" && typeof node.text === "string") return node.text;
  return (node.content ?? []).map((child) => contentInlineText(child)).join("");
}

/**
 * Extrae texto visible de un nodo Tiptap.
 * @param value - Nodo candidato.
 * @returns Texto plano.
 */
export function contentText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text" && typeof node.text === "string") return node.text;
  return (node.content ?? []).map((child) => contentText(child)).join(" ");
}
