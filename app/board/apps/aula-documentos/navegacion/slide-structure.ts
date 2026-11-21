import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { buildPresentationSlides } from "../../../../../lib/domain/aula-documentos/presentation";

/** Diapositiva editable con su contenido y su nota. */
export type AulaSlideDraft = {
  content: JSONContent[];
  notes: string;
};

/**
 * Lee las diapositivas actuales y sus notas por índice.
 * @param editor - Editor activo.
 * @param notes - Notas guardadas por índice.
 * @returns Diapositivas independientes listas para operar.
 */
export function readAulaSlideDrafts(editor: Editor, notes: Record<string, string>): AulaSlideDraft[] {
  return buildPresentationSlides(editor.getJSON()).map((slide, index) => ({
    content: structuredClone(slide.content),
    notes: notes[String(index)] ?? "",
  }));
}

/**
 * Normaliza las notas a índices consecutivos.
 * @param slides - Diapositivas en su orden final.
 * @returns Notas sin huecos ni notas vacías.
 */
export function notesForAulaSlides(slides: AulaSlideDraft[]): Record<string, string> {
  const notes: Record<string, string> = {};
  slides.forEach((slide, index) => {
    if (slide.notes.trim()) notes[String(index)] = slide.notes;
  });
  return notes;
}

/**
 * Calcula la posición de inicio de una diapositiva en un documento.
 * @param document - Documento ya transformado.
 * @param targetIndex - Índice de diapositiva buscado.
 * @returns Posición Tiptap del primer bloque o cero.
 */
function slideStartPosition(document: { forEach: (callback: (node: { type: { name: string } }, offset: number) => boolean | void) => void }, targetIndex: number): number {
  let index = -1;
  let seenContent = false;
  let start = 0;
  document.forEach((node, offset) => {
    if (node.type.name === "slideBreak") {
      seenContent = false;
      return;
    }
    if (!seenContent) {
      index += 1;
      seenContent = true;
      if (index === targetIndex) {
        start = offset;
        return false;
      }
    }
  });
  return start;
}

/**
 * Reemplaza el contenido con una secuencia explícita de diapositivas.
 * @param editor - Editor activo.
 * @param slides - Diapositivas en su orden final.
 * @param targetIndex - Diapositiva que debe quedar seleccionada.
 * @returns `true` si se aplicó la transacción.
 */
export function replaceAulaSlideDrafts(editor: Editor, slides: AulaSlideDraft[], targetIndex: number): boolean {
  const content = slides.flatMap((slide, index) => [
    ...(index > 0 ? [{ type: "slideBreak" }] : []),
    ...slide.content,
  ]);
  const nextDocument = editor.schema.nodeFromJSON({ type: "doc", content });
  const transaction = editor.state.tr;
  transaction.replaceWith(0, transaction.doc.content.size, nextDocument.content);
  const position = slideStartPosition(transaction.doc, targetIndex);
  const target = Math.min(position + 1, transaction.doc.content.size);
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(target)));
  transaction.scrollIntoView();
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}
