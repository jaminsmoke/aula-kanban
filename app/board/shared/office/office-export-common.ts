import type { JSONContent } from "@tiptap/core";

/** Resultado de una exportación Office. */
export type OfficeExportResult = {
  blob: Blob;
  warnings: string[];
};

/**
 * Extrae el texto de un nodo Tiptap.
 * @param node - Nodo del documento.
 * @returns Texto plano concatenado.
 */
export function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * Añade un aviso sin duplicarlo.
 * @param warnings - Lista de avisos.
 * @param warning - Aviso que se quiere añadir.
 */
export function addWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}
