"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { SeparatorHorizontal, Trash2 } from "lucide-react";

/**
 * Marca visual del salto de diapositiva dentro del documento.
 * @param props - Props del NodeView.
 * @returns La línea con la etiqueta y el botón de borrar.
 */
function SlideBreakView({ deleteNode, editor, selected }: NodeViewProps) {
  const readOnly = !editor.isEditable;
  return (
    <NodeViewWrapper
      className={`aula-slide-break${selected ? " is-selected" : ""}`}
      data-slide-break=""
      contentEditable={false}
    >
      <SeparatorHorizontal size={15} aria-hidden />
      <span>Salto de diapositiva</span>
      {!readOnly ? (
        <button
          type="button"
          className="aula-slide-break-delete"
          onClick={() => deleteNode()}
          aria-label="Eliminar salto de diapositiva"
          title="Eliminar salto de diapositiva"
        >
          <Trash2 size={13} aria-hidden />
        </button>
      ) : null}
    </NodeViewWrapper>
  );
}

/** Nodo atómico que separa diapositivas en el documento. */
export const SlideBreak = Node.create({
  name: "slideBreak",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-slide-break]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-slide-break": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SlideBreakView);
  },
});
