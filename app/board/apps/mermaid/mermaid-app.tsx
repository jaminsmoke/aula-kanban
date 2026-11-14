"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDocument } from "../use-app-document";
import "./mermaid.css";

type Template = { id: string; label: string; code: string };

const TEMPLATES: Template[] = [
  {
    id: "flujo",
    label: "Diagrama de flujo",
    code: `flowchart TD
  A[Inicio] --> B{¿Hay tarea?}
  B -- Sí --> C[Trabajar]
  B -- No --> D[Descansar]
  C --> E[Entregar]
  D --> E
  E --> F[Fin]`,
  },
  {
    id: "secuencia",
    label: "Diagrama de secuencia",
    code: `sequenceDiagram
  participant A as Alumno
  participant P as Profesor
  A->>P: ¿Puedo entregar mañana?
  P-->>A: Sí, hasta las 20:00
  A->>P: Gracias`,
  },
  {
    id: "gantt",
    label: "Gantt",
    code: `gantt
  title Plan de proyecto
  dateFormat YYYY-MM-DD
  section Investigación
  Buscar fuentes   :a1, 2026-01-10, 5d
  Redactar         :a2, after a1, 7d
  section Entrega
  Revisar          :a3, after a2, 3d
  Presentar        :a4, after a3, 1d`,
  },
  {
    id: "clases",
    label: "Diagrama de clases",
    code: `classDiagram
  class Tarea {
    +String titulo
    +String estado
    +mover()
  }
  class Alumno {
    +String nombre
    +entregar()
  }
  Alumno "1" --> "*" Tarea : tiene`,
  },
  {
    id: "estados",
    label: "Estados",
    code: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : empezar
  EnCurso --> Hecho : terminar
  Hecho --> [*]`,
  },
  {
    id: "tiempo",
    label: "Línea de tiempo",
    code: `timeline
  title Historia del aula
  2020 : Se crea el proyecto
  2022 : Primeros talleres
  2024 : Exposición final`,
  },
];

type MermaidApi = typeof import("mermaid").default;

/**
 * Da al SVG un tamaño explícito (el del viewBox) para que los diagramas anchos
 * se puedan leer con desplazamiento en lugar de encogerse.
 * @param svg - SVG generado por Mermaid.
 * @returns El SVG con ancho y alto explícitos.
 */
function normalizeSvg(svg: string): string {
  const opening = /<svg[^>]*>/.exec(svg);
  if (!opening) return svg;
  const tag = opening[0];
  const viewBox = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(tag);
  if (!viewBox) return svg;
  const [, , , width, height] = viewBox;
  const nextTag = tag
    .replace(/style="max-width:[^"]*"/, 'style="max-width:none"')
    .replace(/\swidth="[^"]*"/, ` width="${width}"`)
    .replace(/\sheight="[^"]*"/, ` height="${height}"`);
  return svg.replace(tag, nextTag);
}

/**
 * Editor de diagramas Mermaid con vista previa, plantillas, guardado por
 * proyecto y exportación en SVG.
 * @param props - Proyecto activo.
 * @returns El editor y la vista previa del diagrama.
 */
export default function MermaidApp({ projectId }: { projectId: string }) {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const mermaid = useRef<MermaidApi | null>(null);
  const renderSeq = useRef(0);
  const renderChain = useRef<Promise<void>>(Promise.resolve());
  const statusTimer = useRef<number | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);

  const storageKey = `aula.mermaid.${projectId}`;
  const { load: loadDocument, save: saveDocument } = useAppDocument<{ code: string }>(projectId, "mermaid");

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 2400);
  }, []);

  const render = useCallback((source: string): Promise<void> => {
    const sequence = ++renderSeq.current;

    const run = async () => {
      if (sequence !== renderSeq.current) return;
      if (!source.trim()) {
        setSvg("");
        setError(null);
        return;
      }
      try {
        if (!mermaid.current) {
          const mermaidModule = await import("mermaid");
          mermaidModule.default.initialize({
            startOnLoad: false,
            theme: "base",
            securityLevel: "strict",
            fontFamily: '"Instrument Sans", system-ui, sans-serif',
            themeVariables: {
              primaryColor: "#eeebfb",
              primaryTextColor: "#211b36",
              primaryBorderColor: "#5839be",
              lineColor: "#5839be",
              secondaryColor: "#f7f5fd",
              tertiaryColor: "#ffffff",
            },
          });
          mermaid.current = mermaidModule.default;
        }
        const { svg: next } = await (async () => {
          if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
          return mermaid.current!.render(`aula-mermaid-${sequence}`, source);
        })();
        if (sequence !== renderSeq.current) return;
        setSvg(normalizeSvg(next));
        setError(null);
      } catch (caught) {
        if (sequence !== renderSeq.current) return;
        const message = caught instanceof Error ? caught.message.split("\n")[0] : "No se pudo dibujar el diagrama.";
        setError(message);
      }
    };

    // Mermaid comparte estado global: las representaciones se encadenan para
    // que dos cambios rápidos no produzcan un SVG a medio medir.
    renderChain.current = renderChain.current.then(run, run);
    return renderChain.current;
  }, []);

  // Vista previa con retardo mientras se escribe.
  useEffect(() => {
    const timer = window.setTimeout(() => { void render(code); }, 350);
    return () => window.clearTimeout(timer);
  }, [code, render]);

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
  }, [loadDocument, storageKey]);

  const save = async () => {
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      /* sin respaldo local */
    }
    const saved = await saveDocument({ code });
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

  const clear = () => {
    setCode("");
    setSvg("");
    setError(null);
    flash("Editor limpiado");
  };

  const applyTemplate = (id: string) => {
    const template = TEMPLATES.find((item) => item.id === id);
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
            {TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void save()}>Guardar</button>
        <button type="button" onClick={() => void load()}>Cargar</button>
        <button type="button" onClick={exportSvg}>Exportar SVG</button>
        <button type="button" onClick={clear}>Limpiar</button>
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
