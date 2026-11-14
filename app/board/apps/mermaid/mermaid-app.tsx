"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDocument } from "../use-app-document";
import { MERMAID_TEMPLATES } from "./mermaid-templates";
import { useMermaidPreview } from "./use-mermaid-preview";
import "./mermaid.css";

/**
 * Editor de diagramas Mermaid con vista previa, plantillas, guardado por
 * proyecto y exportación en SVG.
 * @param props - Proyecto activo.
 * @returns El editor y la vista previa del diagrama.
 */
export default function MermaidApp({ projectId }: { projectId: string }) {
  const { code, setCode, svg, error, clear } = useMermaidPreview(MERMAID_TEMPLATES[0].code);
  const [status, setStatus] = useState("");
  const statusTimer = useRef<number | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  const storageKey = `aula.mermaid.${projectId}`;
  const { load: loadDocument, save: saveDocument } = useAppDocument<{ code: string }>(projectId, "mermaid");

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 2400);
  }, []);

  // Carga inicial: base de datos y, si falla, respaldo local.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const document = await loadDocument();
      if (!cancelled && document.state?.code) { setCode(document.state.code); return; }
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (!cancelled && saved) setCode(saved);
      } catch {
        /* sin respaldo local */
      }
    })();
    return () => { cancelled = true; };
  }, [loadDocument, storageKey, setCode]);

  const save = async () => {
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      /* sin respaldo local */
    }
    const saved = await saveDocument({ code: code });
    flash(saved ? "Diagrama guardado" : "Guardado solo en este navegador");
  };

  const load = async () => {
    try {
      const document = await loadDocument();
      if (document.state?.code) { setCode(document.state.code); flash("Diagrama cargado"); return; }
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) { flash("No hay ningún diagrama guardado"); return; }
      setCode(saved);
      flash("Diagrama cargado del navegador");
    } catch {
      flash("No se pudo cargar el diagrama");
    }
  };

  const exportSvg = () => {
    if (!svg) { flash("Todavía no hay diagrama que exportar"); return; }
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diagrama-${projectId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    flash("Diagrama exportado");
  };

  const clearEditor = () => {
    clear();
    flash("Editor limpiado");
  };

  const applyTemplate = (id: string) => {
    const template = MERMAID_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setCode(template.code);
    flash(`Plantilla: ${template.label}`);
  };

  return (
    <div className="mermaid-app">
      <div className="mermaid-toolbar">
        <label className="mermaid-template">
          <span>Plantilla</span>
          <select defaultValue="" onChange={(event) => { if (event.target.value) applyTemplate(event.target.value); }}>
            <option value="" disabled>Elegir…</option>
            {MERMAID_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void save()}>Guardar</button>
        <button type="button" onClick={() => void load()}>Cargar</button>
        <button type="button" onClick={exportSvg}>Exportar SVG</button>
        <button type="button" onClick={clearEditor}>Limpiar</button>
        <span className="mermaid-status" role="status">{status}</span>
      </div>

      <div className="mermaid-body">
        <div className="mermaid-editor">
          <label className="mermaid-editor-label" htmlFor="mermaid-code">Código del diagrama</label>
          <textarea
            id="mermaid-code"
            ref={editor}
            value={code}
            spellCheck={false}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              event.preventDefault();
              const target = event.currentTarget;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const next = `${code.slice(0, start)}  ${code.slice(end)}`;
              setCode(next);
              window.requestAnimationFrame(() => {
                editor.current?.setSelectionRange(start + 2, start + 2);
              });
            }}
          />
        </div>

        <div className="mermaid-preview">
          <div className="mermaid-preview-head">
            <span>Vista previa</span>
            {error ? <span className="mermaid-error" role="alert">{error}</span> : null}
          </div>
          <div className="mermaid-canvas">
            {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="mermaid-empty">El diagrama aparecerá aquí.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
