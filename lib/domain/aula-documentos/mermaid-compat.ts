import type { JSONContent } from "@tiptap/core";
import { parseAulaDocument, type AulaDocument } from "./document";

/** Resultado de leer el diagrama principal de un documento de Aula. */
export type AulaMermaidReadResult =
  | { ok: true; code: string | null; document: AulaDocument }
  | { ok: false; message: string };

/** Resultado de actualizar el diagrama principal de un documento de Aula. */
export type AulaMermaidWriteResult =
  | { ok: true; document: AulaDocument }
  | { ok: false; message: string };

/**
 * Busca el primer bloque Mermaid del árbol.
 * @param node - Nodo candidato.
 * @returns Su código o `null`.
 */
function firstMermaidCode(node: JSONContent | undefined): string | null {
  if (!node) return null;
  if (node.type === "mermaidBlock") {
    const code = node.attrs?.code;
    return typeof code === "string" ? code : null;
  }
  for (const child of node.content ?? []) {
    const found = firstMermaidCode(child);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Reemplaza el primer bloque Mermaid sin mutar el árbol original.
 * @param node - Nodo que se recorre.
 * @param code - Código nuevo.
 * @returns El nodo clonado y si se encontró un bloque.
 */
function replaceFirstMermaid(node: JSONContent, code: string): { node: JSONContent; found: boolean } {
  if (node.type === "mermaidBlock") {
    return { node: { ...node, attrs: { ...node.attrs, code } }, found: true };
  }
  let found = false;
  const content = (node.content ?? []).map((child) => {
    if (found) return child;
    const next = replaceFirstMermaid(child, code);
    if (next.found) found = true;
    return next.node;
  });
  return { node: { ...node, ...(node.content ? { content } : {}) }, found };
}

/**
 * Lee el diagrama principal del documento de Aula Documentos.
 * @param value - Estado guardado en `app_documents`.
 * @returns El código y el documento validado, o el error de formato.
 */
export function readAulaMermaidCode(value: unknown): AulaMermaidReadResult {
  const parsed = parseAulaDocument(value);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  return {
    ok: true,
    code: firstMermaidCode(parsed.document.content),
    document: parsed.document,
  };
}

/**
 * Actualiza el primer diagrama del documento de Aula o añade uno al final.
 * @param value - Estado guardado en `app_documents`.
 * @param code - Código Mermaid que se quiere guardar.
 * @returns El documento validado con el diagrama actualizado.
 */
export function writeAulaMermaidCode(value: unknown, code: string): AulaMermaidWriteResult {
  const parsed = parseAulaDocument(value);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const replaced = replaceFirstMermaid(parsed.document.content, code);
  const content = replaced.found
    ? replaced.node
    : {
      type: "doc",
      content: [...(parsed.document.content.content ?? []), { type: "mermaidBlock", attrs: { code } }],
    };
  const next = parseAulaDocument({
    ...parsed.document,
    content,
  });
  return next.ok ? { ok: true, document: next.document } : { ok: false, message: next.message };
}
