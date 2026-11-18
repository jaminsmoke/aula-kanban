"use client";

import type { Editor } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ArrowDown, ArrowUp, Check, Code2, GripVertical, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useMermaidPreview } from "./use-mermaid-preview";

type MermaidDraftStorage = {
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
 * Aplica todos los borradores Mermaid pendientes antes de leer el documento.
 * @param editor - Editor de Tiptap.
 */
export function flushMermaidDrafts(editor: Editor): void {
  const storage = mermaidStorage(editor);
  if (!storage) return;
  for (const flush of [...storage.drafts.values()]) flush();
}

/**
 * Vista editable de un bloque Mermaid dentro del documento.
 * @param props - Props del NodeView de Tiptap.
 * @returns El bloque con código, vista previa y controles.
 */
function MermaidBlockView({ node, deleteNode, editor, selected, getPos }: NodeViewProps) {
  const code = typeof node.attrs.code === "string" ? node.attrs.code : "";
  const [draft, setDraft] = useState(code);
  const [editing, setEditing] = useState(!code.trim());
  const draftId = useId();
  const readOnly = !editor.isEditable;
  const previewCode = editing ? draft : code;
  const { svg, error, loading } = useMermaidPreview(previewCode);
  const position = getPos();
  const parent = typeof position === "number" ? editor.state.doc.resolve(position).parent : null;
  const index = typeof position === "number" ? editor.state.doc.resolve(position).index() : -1;
  const canMoveUp = index > 0;
  const canMoveDown = Boolean(parent && index >= 0 && index < parent.childCount - 1);

  /**
   * Aplica el código al nodo como un cambio de historial independiente.
   * @param nextCode - Código que se guarda en el bloque.
   */
  const applyMermaidCode = useCallback((nextCode: string) => {
    if (typeof position !== "number") return;
    editor.commands.command(({ tr }) => {
      closeHistory(tr);
      tr.setNodeMarkup(position, undefined, { ...node.attrs, code: nextCode });
      return true;
    });
  }, [editor, node.attrs, position]);

  /**
   * Aplica el borrador al nodo y, opcionalmente, cierra el editor.
   * @param closeEditor - Indica si se debe cerrar el textarea.
   */
  const commitDraft = useCallback((closeEditor: boolean) => {
    const next = draft.trim();
    if (!next) {
      if (closeEditor) setEditing(false);
      return;
    }
    const liveNode = typeof position === "number" ? editor.state.doc.nodeAt(position) : null;
    const liveCode = typeof liveNode?.attrs?.code === "string" ? liveNode.attrs.code : code;
    if (draft !== liveCode) applyMermaidCode(draft);
    if (closeEditor) setEditing(false);
  }, [applyMermaidCode, code, draft, editor, position]);

  const flushDraft = useCallback(() => {
    if (editing) commitDraft(false);
  }, [commitDraft, editing]);

  useEffect(() => {
    registerMermaidDraft(editor, draftId, flushDraft);
    return () => unregisterMermaidDraft(editor, draftId);
  }, [draftId, editor, flushDraft]);

  /**
   * Abre el editor con el código guardado.
   */
  function startEditing() {
    setDraft(code);
    setEditing(true);
  }

  /**
   * Mueve el bloque una posición arriba o abajo.
   * @param direction - `-1` para subir y `1` para bajar.
   */
  function moveBlock(direction: -1 | 1) {
    if (typeof position !== "number") return;
    const { state, view } = editor;
    const resolved = state.doc.resolve(position);
    const parentNode = resolved.parent;
    const currentIndex = resolved.index();
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= parentNode.childCount) return;
    const target = parentNode.child(targetIndex);
    const transaction = state.tr.delete(position, position + node.nodeSize);
    const insertAt = direction < 0
      ? position - target.nodeSize
      : position + target.nodeSize;
    view.dispatch(transaction.insert(insertAt, node));
  }

  /**
   * Guarda el código editado en el atributo del nodo.
   */
  function applyCode() {
    commitDraft(true);
  }

  /**
   * Descarta el borrador y vuelve al código guardado.
   */
  function cancelEdit() {
    setDraft(code);
    setEditing(false);
  }

  return (
    <NodeViewWrapper
      className={`aula-mermaid-block${selected ? " is-selected" : ""}`}
      data-mermaid-block=""
      data-mermaid-code={code}
      contentEditable={false}
    >
      <div className="aula-mermaid-head">
        <span className="aula-mermaid-grip" data-drag-handle title="Arrastrar para mover">
          <GripVertical size={15} aria-hidden />
        </span>
        <span className="aula-mermaid-label">
          <Code2 size={15} aria-hidden />
          Diagrama Mermaid
        </span>
        {!readOnly ? (
          <span className="aula-mermaid-actions">
            <button
              type="button"
              className="aula-mermaid-action icon"
              onClick={() => moveBlock(-1)}
              disabled={!canMoveUp}
              aria-label="Mover diagrama arriba"
              title="Mover diagrama arriba"
            >
              <ArrowUp size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="aula-mermaid-action icon"
              onClick={() => moveBlock(1)}
              disabled={!canMoveDown}
              aria-label="Mover diagrama abajo"
              title="Mover diagrama abajo"
            >
              <ArrowDown size={14} aria-hidden />
            </button>
            {editing ? (
              <>
                <button type="button" className="aula-mermaid-action" onClick={applyCode} disabled={!draft.trim()}>
                  <Check size={14} aria-hidden />
                  Aplicar
                </button>
                <button type="button" className="aula-mermaid-action secondary" onClick={cancelEdit}>
                  <X size={14} aria-hidden />
                  Descartar
                </button>
              </>
            ) : (
              <button type="button" className="aula-mermaid-action" onClick={startEditing}>
                <Pencil size={14} aria-hidden />
                Editar
              </button>
            )}
            <button
              type="button"
              className="aula-mermaid-action danger"
              onClick={() => deleteNode()}
              aria-label="Eliminar diagrama"
              title="Eliminar diagrama"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </span>
        ) : null}
      </div>

      {editing && !readOnly ? (
        <textarea
          className="aula-mermaid-code"
          value={draft}
          spellCheck={false}
          aria-label="Código Mermaid"
          onChange={(event) => {
            setDraft(event.target.value);
            mermaidStorage(editor)?.onDraftChange?.();
          }}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (next instanceof HTMLElement && next.closest(".aula-mermaid-block")) return;
            commitDraft(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              applyCode();
            }
          }}
        />
      ) : null}

      <div className="aula-mermaid-preview" aria-busy={loading}>
        {loading ? (
          <p className="aula-mermaid-state">
            <Loader2 size={15} className="aula-mermaid-spin" aria-hidden />
            Dibujando…
          </p>
        ) : error ? (
          <p className="aula-mermaid-error" role="alert">{error}</p>
        ) : svg ? (
          <div className="aula-mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p className="aula-mermaid-state">
            {readOnly && !code.trim() ? "Este diagrama está vacío." : "El diagrama aparecerá aquí."}
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/** Nodo bloque que guarda el código Mermaid dentro del documento. */
export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addStorage(): MermaidDraftStorage {
    return {
      drafts: new Map<string, () => void>(),
      onDraftChange: null,
    };
  },
  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mermaid-code") ?? "",
        renderHTML: (attributes) => ({ "data-mermaid-code": attributes.code }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-mermaid-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-mermaid-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },
});
