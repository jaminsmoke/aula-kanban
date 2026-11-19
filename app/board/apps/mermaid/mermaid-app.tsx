"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import type { StoreRole } from "../types";
import { useVersionedDraft } from "../use-versioned-draft";
import { useWindowClose } from "../../shared/window-close-guard";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import { useMermaidPreview } from "./use-mermaid-preview";
import MermaidCanvasView from "./mermaid-canvas-view";
import GanttEditor from "../../shared/mermaid/gantt-editor";
import { parseGanttDocument, serializeGanttDocument, type GanttDocument } from "../../../../lib/domain/mermaid/gantt";
import { tokenizeMermaidLine } from "./mermaid-highlight";
import { mermaidFileName } from "./mermaid-filename";
import VersionConflictDialog from "../version-conflict-dialog";
import UnsavedChangesDialog from "../unsaved-changes-dialog";
import "./mermaid.css";

/**
 * Editor de diagramas Mermaid con vista previa, plantillas, guardado por
 * proyecto y exportación en SVG.
 * @param props - Proyecto activo y rol del usuario.
 * @returns El editor y la vista previa del diagrama.
 */
export default function MermaidApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const { code, setCode, svg, error, clear } = useMermaidPreview(MERMAID_TEMPLATES[0].code);
  const [flashStatus, setFlashStatus] = useState("");
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"code" | "guided">("code");
  const [guidedDocument, setGuidedDocument] = useState<GanttDocument | null>(null);
  const statusTimer = useRef<number | null>(null);
  const fallbackChecked = useRef(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const readOnly = role === "guest";
  const forceClose = useWindowClose();

  const storageKey = `aula.mermaid.${projectId}`;
  const draft = useVersionedDraft<{ code: string }>({
    projectId,
    appId: "mermaid",
    getValue: () => ({ code }),
    applyLoaded: (loaded) => {
      if (!loaded || typeof loaded.code !== "string") return false;
      setCode(loaded.code);
      return true;
    },
    readOnly,
    formatCopy: (value) => ({
      contents: JSON.stringify(value, null, 2),
      type: "application/json;charset=utf-8",
      fileName: mermaidFileName(value.code).replace(/\.svg$/, "-recuperacion.json"),
    }),
    onCloseBlocked: () => setClosePromptOpen(true),
    onSaved: () => setClosePromptOpen(false),
  });

  const flash = useCallback((message: string) => {
    setFlashStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setFlashStatus(""), 2400);
  }, []);

  const { ready: draftReady, updatedAt: draftUpdatedAt, dirty: draftDirty, markDirty } = draft;

  useEffect(() => {
    if (!draftReady || draftDirty || fallbackChecked.current || readOnly || draftUpdatedAt !== null) return;
    fallbackChecked.current = true;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (!saved) return;
        setCode(saved);
        markDirty("Diagrama recuperado de este navegador.");
        flash("Diagrama recuperado de este navegador");
      } catch {
        /* sin respaldo local */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftDirty, draftReady, draftUpdatedAt, flash, markDirty, readOnly, setCode, storageKey]);

  const save = async () => {
    if (readOnly) return;
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      /* sin respaldo local */
    }
    const saved = await draft.save(false);
    flash(saved ? "Diagrama guardado" : "No se pudo guardar el diagrama");
  };

  const saveAndClose = async () => {
    setClosePromptOpen(false);
    if (await draft.save(false)) forceClose();
  };

  const load = async () => {
    if (readOnly) return;
    if (draft.dirty && !window.confirm("Se reemplazará el diagrama actual. ¿Continuar?")) return;
    const loaded = await draft.reload();
    if (loaded) {
      setEditorMode("code");
      setGuidedDocument(null);
      flash("Diagrama cargado");
      return;
    }
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        flash("No hay ningún diagrama guardado");
        return;
      }
      setCode(saved);
      setEditorMode("code");
      setGuidedDocument(null);
      draft.markDirty("Diagrama cargado del navegador.");
      flash("Diagrama cargado del navegador");
    } catch {
      flash("No se pudo cargar el diagrama");
    }
  };

  const exportSvg = () => {
    if (!svg) {
      flash("Todavía no hay diagrama que exportar");
      return;
    }
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mermaidFileName(code);
    link.click();
    URL.revokeObjectURL(url);
    flash("Diagrama exportado");
  };

  const clearEditor = () => {
    if (readOnly) return;
    if (draft.dirty && !window.confirm("Se limpiará el diagrama actual. ¿Continuar?")) return;
    clear();
    setEditorMode("code");
    setGuidedDocument(null);
    draft.markDirty("Editor limpiado.");
    flash("Editor limpiado");
  };

  const applyTemplate = (id: string) => {
    if (readOnly) return;
    const template = MERMAID_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    if (draft.dirty && !window.confirm("Se reemplazará el diagrama actual. ¿Continuar?")) return;
    setCode(template.code);
    setEditorMode("code");
    setGuidedDocument(null);
    draft.markDirty(`Plantilla: ${template.label}`);
    flash(`Plantilla: ${template.label}`);
  };

  const statusText = flashStatus || draft.error || draft.status;
  const busy = draft.loading || draft.saving;
  const lines = useMemo(() => code.split("\n"), [code]);
  const highlightedLines = useMemo(() => lines.map(tokenizeMermaidLine), [lines]);
  const errorLine = error?.line ?? null;
  const canGuide = useMemo(() => Boolean(parseGanttDocument(code)), [code]);
  const guidedActive = editorMode === "guided" && guidedDocument !== null;

  function enterGuided() {
    if (readOnly) return;
    const parsed = parseGanttDocument(code);
    if (!parsed) {
      flash("Este diagrama no se puede editar como contenido; usa Código.");
      return;
    }
    setGuidedDocument(parsed);
    setEditorMode("guided");
  }

  function updateGuided(next: GanttDocument) {
    setGuidedDocument(next);
    setCode(serializeGanttDocument(next));
    draft.markDirty("Contenido del diagrama actualizado.");
  }

  function leaveGuided() {
    setEditorMode("code");
  }

  function syncEditorScroll(event: UIEvent<HTMLTextAreaElement>) {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  }

  function jumpToLine(line: number) {
    const target = editor.current;
    if (!target) return;
    const index = Math.max(0, Math.min(lines.length - 1, line - 1));
    const start = lines.slice(0, index).reduce((total, text) => total + text.length + 1, 0);
    const end = start + lines[index].length;
    target.focus();
    target.setSelectionRange(start, end);
  }

  return (
    <div className="mermaid-app">
      <div className="mermaid-toolbar">
        <label className="mermaid-template">
          <span>Plantilla</span>
          <select
            defaultValue=""
            disabled={readOnly || busy || Boolean(draft.conflict)}
            onChange={(event) => { if (event.target.value) applyTemplate(event.target.value); }}
          >
            <option value="" disabled>Elegir…</option>
            {MERMAID_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void save()} disabled={readOnly || busy || Boolean(draft.conflict)}>Guardar</button>
        <button type="button" onClick={() => void load()} disabled={readOnly || busy || Boolean(draft.conflict)}>Cargar</button>
        <button type="button" onClick={exportSvg}>Exportar SVG</button>
        <button type="button" onClick={clearEditor} disabled={readOnly || busy || draft.conflict !== null}>Limpiar</button>
        <span className="mermaid-status" role="status">{statusText}</span>
      </div>

      {readOnly ? (
        <p className="mermaid-readonly" role="note">
          Modo lectura: puedes consultar y exportar el diagrama, pero no editarlo ni guardarlo.
        </p>
      ) : null}

      <div className="mermaid-body">
        <div className="mermaid-editor">
          <div className="mermaid-editor-head">
            {guidedActive ? (
              <span className="mermaid-editor-label">Contenido del Gantt</span>
            ) : (
              <label className="mermaid-editor-label" htmlFor="mermaid-code">Código del diagrama</label>
            )}
            {canGuide && !readOnly ? (
              <div className="mermaid-editor-modes" role="group" aria-label="Modo de edición">
                <button
                  type="button"
                  className={guidedActive ? "is-active" : undefined}
                  aria-pressed={guidedActive}
                  onClick={enterGuided}
                >
                  Contenido
                </button>
                <button
                  type="button"
                  className={!guidedActive ? "is-active" : undefined}
                  aria-pressed={!guidedActive}
                  onClick={leaveGuided}
                >
                  Código
                </button>
              </div>
            ) : null}
          </div>
          {guidedActive && guidedDocument ? (
            <GanttEditor value={guidedDocument} onChange={updateGuided} readOnly={readOnly} />
          ) : (
            <div className="mermaid-editor-body">
              <div className="mermaid-line-numbers" ref={gutterRef} aria-hidden>
                {lines.map((_, index) => (
                  <span key={index} className={index + 1 === errorLine ? "is-error" : undefined}>{index + 1}</span>
                ))}
              </div>
              <div className="mermaid-editor-code">
                <pre ref={highlightRef} className="mermaid-highlight" aria-hidden>
                  <code>
                    {highlightedLines.map((tokens, index) => (
                      <span className="mermaid-highlight-line" key={index}>
                        {tokens.map((token, tokenIndex) => (
                          <span className={`mermaid-token mermaid-token-${token.kind}`} key={tokenIndex}>{token.text}</span>
                        ))}
                        {index < lines.length - 1 ? "\n" : null}
                      </span>
                    ))}
                  </code>
                </pre>
                <textarea
                  id="mermaid-code"
                  ref={editor}
                  value={code}
                  spellCheck={false}
                  readOnly={readOnly}
                  wrap="off"
                  onScroll={syncEditorScroll}
                  onChange={(event) => {
                    if (readOnly) return;
                    setCode(event.target.value);
                    draft.markDirty("Diagrama modificado.");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab" || readOnly) return;
                    event.preventDefault();
                    const target = event.currentTarget;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const next = `${code.slice(0, start)}  ${code.slice(end)}`;
                    setCode(next);
                    draft.markDirty("Diagrama modificado.");
                    window.requestAnimationFrame(() => {
                      editor.current?.setSelectionRange(start + 2, start + 2);
                    });
                  }}
                />
              </div>
            </div>
          )}
          {error ? (
            <section className="mermaid-error-detail" role="region" aria-label="Detalle del error">
              <p>{error.summary}</p>
              <pre>{error.detail}</pre>
              {error.line ? (
                <button type="button" onClick={() => jumpToLine(error.line!)}>
                  Ir a la línea {error.line}
                </button>
              ) : null}
            </section>
          ) : null}
        </div>

        <MermaidCanvasView key={svg} svg={svg} error={error?.summary ?? null} />
      </div>

      <UnsavedChangesDialog
        open={closePromptOpen && !draft.conflict}
        busy={draft.saving}
        notice={draft.saveFailed ? draft.status : null}
        onStay={() => setClosePromptOpen(false)}
        onDiscard={() => {
          setClosePromptOpen(false);
          forceClose();
        }}
        onSave={() => { void saveAndClose(); }}
      />

      <VersionConflictDialog
        open={Boolean(draft.conflict)}
        serverUpdatedAt={draft.conflict?.serverUpdatedAt ?? null}
        notice={draft.conflictNotice}
        busy={draft.saving}
        onDownload={() => { draft.downloadCopy(); }}
        onReload={() => { void draft.reloadServerVersion(); }}
        onKeepMine={() => { void draft.keepMineVersion(); }}
      />
    </div>
  );
}
