"use client";

import { closeHistory } from "@tiptap/pm/history";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { parseGanttDocument, serializeGanttDocument, type GanttDocument } from "../../../../lib/domain/mermaid/gantt";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import GanttEditor from "../mermaid/gantt-editor";
import { downloadBlob } from "../ui/download";
import { MermaidBlockHeader } from "./mermaid-block-header";
import { MermaidBlockPreview } from "./mermaid-block-preview";
import {
  notifyMermaidDraftChange,
  registerMermaidDraft,
  unregisterMermaidDraft,
} from "./mermaid-block-storage";
import { useMermaidPreview } from "./use-mermaid-preview";
import { useMermaidVisibility } from "./use-mermaid-visibility";

/**
 * Vista editable de un bloque Mermaid dentro del documento.
 * @param props - Props del NodeView de Tiptap.
 * @returns El bloque con código, vista previa y controles.
 */
export function MermaidBlockView({ node, deleteNode, editor, selected, getPos }: NodeViewProps) {
  const code = typeof node.attrs.code === "string" ? node.attrs.code : "";
  const [draft, setDraft] = useState(code);
  const [editing, setEditing] = useState(!code.trim());
  const [guided, setGuided] = useState(false);
  const [guidedDocument, setGuidedDocument] = useState<GanttDocument | null>(null);
  const draftId = useId();
  const blockRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baselineRef = useRef(code);
  const visible = useMermaidVisibility(blockRef);
  const readOnly = !editor.isEditable;
  const previewCode = editing ? draft : code;
  const { svg, error, loading, lastValidCode } = useMermaidPreview(previewCode, visible);
  const position = getPos();
  const parent = typeof position === "number" ? editor.state.doc.resolve(position).parent : null;
  const index = typeof position === "number" ? editor.state.doc.resolve(position).index() : -1;
  const canMoveUp = index > 0;
  const canMoveDown = Boolean(parent && index >= 0 && index < parent.childCount - 1);
  const activeCode = editing ? draft : code;
  const canGuide = parseGanttDocument(activeCode) !== null;
  const canRestore = Boolean(lastValidCode.trim()) && lastValidCode !== activeCode;

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
    if (closeEditor) {
      baselineRef.current = draft;
      setEditing(false);
      setGuided(false);
    }
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
    baselineRef.current = code;
    setDraft(code);
    setGuided(false);
    setGuidedDocument(null);
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
   * Descarta el borrador y vuelve al código con el que empezó la edición.
   */
  function cancelEdit() {
    const baseline = baselineRef.current;
    setDraft(baseline);
    setEditing(false);
    setGuided(false);
    setGuidedDocument(null);
    const liveNode = typeof position === "number" ? editor.state.doc.nodeAt(position) : null;
    const liveCode = typeof liveNode?.attrs?.code === "string" ? liveNode.attrs.code : code;
    if (baseline !== liveCode) applyMermaidCode(baseline);
  }

  /**
   * Reemplaza el código por una plantilla, con confirmación si ya hay contenido.
   * @param templateId - Identificador de la plantilla elegida.
   */
  function applyTemplate(templateId: string) {
    const template = MERMAID_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    if (activeCode.trim() && !window.confirm("Se reemplazará el código actual del diagrama. ¿Continuar?")) return;
    if (!editing) baselineRef.current = code;
    setDraft(template.code);
    setGuided(false);
    setGuidedDocument(null);
    setEditing(true);
    notifyMermaidDraftChange(editor);
  }

  /**
   * Recupera el último código que se dibujó correctamente.
   */
  function restoreLastValid() {
    if (!lastValidCode.trim()) return;
    if (!editing) baselineRef.current = code;
    setDraft(lastValidCode);
    setGuided(false);
    setGuidedDocument(null);
    setEditing(true);
    notifyMermaidDraftChange(editor);
  }

  /**
   * Abre el editor guiado de Gantt si el código se puede interpretar.
   */
  function enterGuided() {
    const parsed = parseGanttDocument(activeCode);
    if (!parsed) return;
    setGuidedDocument(parsed);
    setGuided(true);
    setEditing(true);
  }

  /**
   * Actualiza el contenido guiado y regenera el código Mermaid.
   * @param next - Documento Gantt editado.
   */
  function updateGuided(next: GanttDocument) {
    setGuidedDocument(next);
    setDraft(serializeGanttDocument(next));
    notifyMermaidDraftChange(editor);
  }

  /**
   * Descarga el SVG visible del bloque.
   */
  function downloadSvg() {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "diagrama-mermaid.svg");
  }

  /**
   * Lleva el foco a la línea que señala el error de Mermaid.
   * @param line - Línea uno-based.
   */
  function jumpToErrorLine(line: number) {
    if (readOnly) return;
    if (!editing) {
      baselineRef.current = code;
      setDraft(code);
      setEditing(true);
    }
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const lines = draft.split("\n");
      const index = Math.max(0, Math.min(lines.length - 1, line - 1));
      const start = lines.slice(0, index).reduce((total, item) => total + item.length + 1, 0);
      textarea.focus();
      textarea.setSelectionRange(start, start + lines[index].length);
      textarea.scrollTop = Math.max(0, index * 20 - textarea.clientHeight / 2);
    });
  }

  /**
   * Copia el código visible del bloque.
   */
  async function copyCode() {
    try {
      await navigator.clipboard?.writeText(activeCode);
    } catch {
      /* La copia depende del permiso del navegador; el código sigue visible. */
    }
  }

  return (
    <NodeViewWrapper
      className={`aula-mermaid-block${selected ? " is-selected" : ""}`}
      data-mermaid-block=""
      data-mermaid-code={code}
      contentEditable={false}
      ref={blockRef}
    >
      <MermaidBlockHeader
        readOnly={readOnly}
        editing={editing}
        canApply={Boolean(draft.trim())}
        canRestore={canRestore}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        canExportSvg={Boolean(svg)}
        onApplyTemplate={applyTemplate}
        onCopy={() => { void copyCode(); }}
        onDownloadSvg={downloadSvg}
        onRestore={restoreLastValid}
        onMoveUp={() => moveBlock(-1)}
        onMoveDown={() => moveBlock(1)}
        onApply={applyCode}
        onCancel={cancelEdit}
        onStartEditing={startEditing}
        onDelete={() => deleteNode()}
      />

      {editing && !readOnly ? (
        <>
          <div className="aula-mermaid-edit-modes" role="group" aria-label="Modo de edición del diagrama">
            <button
              type="button"
              className={`aula-mermaid-action${!guided ? " is-active" : ""}`}
              onClick={() => setGuided(false)}
            >
              Código
            </button>
            <button
              type="button"
              className={`aula-mermaid-action${guided ? " is-active" : ""}`}
              onClick={enterGuided}
              disabled={!canGuide}
              title={canGuide ? "Editar el contenido del Gantt" : "Este diagrama no se puede editar como contenido"}
            >
              Contenido
            </button>
          </div>
          {guided && guidedDocument ? (
            <GanttEditor value={guidedDocument} onChange={updateGuided} readOnly={false} />
          ) : (
            <textarea
              ref={textareaRef}
              className="aula-mermaid-code"
              value={draft}
              spellCheck={false}
              aria-label="Código Mermaid"
              onChange={(event) => {
                setDraft(event.target.value);
                notifyMermaidDraftChange(editor);
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
          )}
        </>
      ) : null}

      <MermaidBlockPreview
        svg={svg}
        error={error}
        loading={loading}
        visible={visible}
        previewCode={previewCode}
        editing={editing}
        readOnly={readOnly}
        onJumpToErrorLine={jumpToErrorLine}
      />
    </NodeViewWrapper>
  );
}
