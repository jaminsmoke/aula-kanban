"use client";

import type { Editor } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ArrowDown, ArrowUp, Check, Code2, Copy, Download, GripVertical, Loader2, Maximize2, Pencil, RotateCcw, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { parseGanttDocument, serializeGanttDocument, type GanttDocument } from "../../../../lib/domain/mermaid/gantt";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import GanttEditor from "../mermaid/gantt-editor";
import { downloadBlob } from "../ui/download";
import { useMermaidPreview } from "./use-mermaid-preview";
import { useMermaidVisibility } from "./use-mermaid-visibility";

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
  const [guided, setGuided] = useState(false);
  const [guidedDocument, setGuidedDocument] = useState<GanttDocument | null>(null);
  const draftId = useId();
  const blockRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
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
  const baselineRef = useRef(code);

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
    mermaidStorage(editor)?.onDraftChange?.();
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
    mermaidStorage(editor)?.onDraftChange?.();
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
    mermaidStorage(editor)?.onDraftChange?.();
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

  /**
   * Cambia el zoom entre el 100 % y el 300 %.
   * @param direction - `1` acerca y `-1` aleja.
   */
  function changeZoom(direction: -1 | 1) {
    setZoom((current) => Math.min(3, Math.max(1, Number((current + direction * 0.25).toFixed(2)))));
  }

  /**
   * Vuelve al 100 % y al inicio de la vista.
   */
  function resetZoom() {
    setZoom(1);
    if (previewRef.current) {
      previewRef.current.scrollLeft = 0;
      previewRef.current.scrollTop = 0;
    }
  }

  /**
   * Empieza el arrastre del diagrama ampliado.
   * @param event - Evento de puntero.
   */
  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    const element = previewRef.current;
    if (!element || zoom <= 1) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    };
    element.setPointerCapture?.(event.pointerId);
  }

  /**
   * Desplaza la vista mientras se arrastra el diagrama.
   * @param event - Evento de puntero.
   */
  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const element = previewRef.current;
    const drag = dragRef.current;
    if (!element || !drag) return;
    element.scrollLeft = drag.left - (event.clientX - drag.x);
    element.scrollTop = drag.top - (event.clientY - drag.y);
  }

  /**
   * Termina el arrastre del diagrama.
   */
  function endPan() {
    dragRef.current = null;
  }

  return (
    <NodeViewWrapper
      className={`aula-mermaid-block${selected ? " is-selected" : ""}`}
      data-mermaid-block=""
      data-mermaid-code={code}
      contentEditable={false}
      ref={blockRef}
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
          <select
            className="aula-mermaid-template"
            aria-label="Insertar plantilla Mermaid"
            defaultValue=""
            onChange={(event) => {
              applyTemplate(event.currentTarget.value);
              event.currentTarget.value = "";
            }}
          >
            <option value="">Plantilla…</option>
            {MERMAID_TEMPLATES.map((template) => (
              <option value={template.id} key={template.id}>{template.label}</option>
            ))}
          </select>
        ) : null}
        {!readOnly ? (
          <span className="aula-mermaid-actions">
            <button
              type="button"
              className="aula-mermaid-action icon"
              onClick={() => { void copyCode(); }}
              aria-label="Copiar código Mermaid"
              title="Copiar código Mermaid"
            >
              <Copy size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="aula-mermaid-action icon"
              onClick={downloadSvg}
              disabled={!svg}
              aria-label="Exportar diagrama SVG"
              title="Exportar diagrama SVG"
            >
              <Download size={14} aria-hidden />
            </button>
            <button
              type="button"
              className="aula-mermaid-action icon"
              onClick={restoreLastValid}
              disabled={!canRestore}
              aria-label="Restaurar última versión válida del diagrama"
              title="Restaurar última versión válida del diagrama"
            >
              <RotateCcw size={14} aria-hidden />
            </button>
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
          )}
        </>
      ) : null}

      {svg && !loading && !error ? (
        <div className="aula-mermaid-zoom-controls" role="group" aria-label="Controles de zoom del diagrama">
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => changeZoom(-1)}
            disabled={zoom <= 1}
            aria-label="Alejar diagrama"
            title="Alejar diagrama"
          >
            <ZoomOut size={14} aria-hidden />
          </button>
          <span className="aula-mermaid-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => changeZoom(1)}
            disabled={zoom >= 3}
            aria-label="Acercar diagrama"
            title="Acercar diagrama"
          >
            <ZoomIn size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={resetZoom}
            disabled={zoom === 1}
            aria-label="Restablecer zoom"
            title="Restablecer zoom"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => { void previewRef.current?.requestFullscreen?.(); }}
            aria-label="Ver diagrama en pantalla completa"
            title="Pantalla completa"
          >
            <Maximize2 size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        className={`aula-mermaid-preview${zoom > 1 ? " is-zoomed" : ""}`}
        aria-busy={loading}
        aria-label="Vista previa del diagrama Mermaid"
        role="group"
        tabIndex={zoom > 1 ? 0 : -1}
        ref={previewRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
        onKeyDown={(event) => {
          const element = previewRef.current;
          if (!element || zoom <= 1) return;
          const step = 28;
          if (event.key === "ArrowLeft") { event.preventDefault(); element.scrollLeft -= step; }
          if (event.key === "ArrowRight") { event.preventDefault(); element.scrollLeft += step; }
          if (event.key === "ArrowUp") { event.preventDefault(); element.scrollTop -= step; }
          if (event.key === "ArrowDown") { event.preventDefault(); element.scrollTop += step; }
        }}
      >
        {!visible ? (
          <p className="aula-mermaid-state">El diagrama se dibujará al acercarte.</p>
        ) : loading ? (
          <p className="aula-mermaid-state">
            <Loader2 size={15} className="aula-mermaid-spin" aria-hidden />
            Dibujando…
          </p>
        ) : error ? (
          <div className="aula-mermaid-error" role="alert">
            <strong>{error.summary}</strong>
            <pre className="aula-mermaid-error-detail">{error.detail}</pre>
            {error.line && !readOnly ? (
              <button type="button" className="aula-mermaid-action" onClick={() => jumpToErrorLine(error.line ?? 1)}>
                Ir a la línea {error.line}
              </button>
            ) : null}
          </div>
        ) : svg ? (
          <div className="aula-mermaid-zoom" data-zoom={zoom} style={{ width: `${zoom * 100}%` }}>
            <div className="aula-mermaid-svg" role="img" aria-label="Diagrama Mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        ) : (
          <p className="aula-mermaid-state">
            {!previewCode.trim()
              ? editing
                ? "Escribe código Mermaid para ver la vista previa."
                : "El diagrama está vacío."
              : "El diagrama aparecerá aquí."}
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
