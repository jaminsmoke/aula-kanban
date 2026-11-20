import type { JSONContent } from "@tiptap/core";
import type { AulaDocument } from "../../../../../lib/domain/aula-documentos/document";

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
 * Formatea la hora del último guardado.
 * @param timestamp - Milisegundos desde epoch.
 * @returns Hora corta o cadena vacía.
 */
export function formatSavedTime(timestamp: number | null): string {
  if (timestamp === null) return "";
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Formatea una fecha de origen.
 * @param timestamp - Milisegundos desde epoch o `null`.
 * @returns Fecha legible o `null`.
 */
export function formatSourceDate(timestamp: number | null): string | null {
  if (timestamp === null || !Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

/**
 * Descarga un Blob mediante un enlace temporal.
 * @param blob - Contenido descargable.
 * @param name - Nombre del archivo.
 */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Descarga un archivo de texto.
 * @param contents - Contenido.
 * @param type - MIME.
 * @param name - Nombre del archivo.
 */
export function downloadTextFile(contents: string, type: string, name: string) {
  downloadBlob(new Blob([contents], { type }), name);
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

/**
 * Sustituye las URLs de las imágenes de una copia por las recién subidas.
 * @param document - Documento de la copia.
 * @param urls - URLs nuevas indexadas por id de subida antiguo.
 * @returns Una copia independiente con las URLs nuevas.
 */
export function remapCopyImageUrls(document: AulaDocument, urls: ReadonlyMap<string, string>): AulaDocument {
  const clone = JSON.parse(JSON.stringify(document)) as AulaDocument;
  const visit = (node: JSONContent) => {
    if (node.type === "aulaImage" && node.attrs) {
      const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
      const id = /^\/api\/files\/([0-9a-f-]{36})$/i.exec(src)?.[1]?.toLowerCase();
      const url = id ? urls.get(id) : undefined;
      if (url) node.attrs = { ...node.attrs, src: url };
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(clone.content);
  return clone;
}
