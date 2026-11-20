import type { Editor } from "@tiptap/core";

/** Almacén interno de borradores Mermaid del editor. */
export type MermaidDraftStorage = {
  drafts: Map<string, () => void>;
  onDraftChange: (() => void) | null;
};

/**
 * Devuelve el almacén interno de borradores Mermaid del editor.
 * @param editor - Editor de Tiptap.
 * @returns El almacén o `null` si la extensión no está registrada.
 */
function mermaidStorage(editor: Editor): MermaidDraftStorage | null {
  const storage = (editor.storage as { mermaidBlock?: Partial<MermaidDraftStorage> }).mermaidBlock;
  return storage ? storage as MermaidDraftStorage : null;
}

/**
 * Registra el volcado de un borrador Mermaid.
 * @param editor - Editor de Tiptap.
 * @param id - Identificador estable del bloque.
 * @param flush - Función que aplica el borrador al nodo.
 */
export function registerMermaidDraft(editor: Editor, id: string, flush: () => void): void {
  mermaidStorage(editor)?.drafts.set(id, flush);
}

/**
 * Retira el registro de un borrador Mermaid.
 * @param editor - Editor de Tiptap.
 * @param id - Identificador del bloque.
 */
export function unregisterMermaidDraft(editor: Editor, id: string): void {
  mermaidStorage(editor)?.drafts.delete(id);
}

/**
 * Define el aviso que se ejecuta al cambiar un borrador Mermaid.
 * @param editor - Editor de Tiptap.
 * @param handler - Aviso o `null`.
 */
export function setMermaidDraftChangeHandler(editor: Editor, handler: (() => void) | null): void {
  const storage = mermaidStorage(editor);
  if (storage) storage.onDraftChange = handler;
}

/**
 * Avisa de que el borrador de un bloque ha cambiado.
 * @param editor - Editor de Tiptap.
 */
export function notifyMermaidDraftChange(editor: Editor): void {
  mermaidStorage(editor)?.onDraftChange?.();
}

/**
 * Aplica todos los borradores Mermaid pendientes antes de leer el documento.
 * @param editor - Editor de Tiptap.
 */
export function flushMermaidDrafts(editor: Editor): void {
  const storage = mermaidStorage(editor);
  if (!storage) return;
  for (const flush of [...storage.drafts.values()]) flush();
}
