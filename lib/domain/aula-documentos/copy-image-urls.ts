import type { JSONContent } from "@tiptap/core";
import type { AulaDocument } from "./document";

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
