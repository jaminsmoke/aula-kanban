"use client";

import "@smst/edu-tools/styles";
import { lazy, Suspense, useEffect, useState } from "react";
import CalculatorPanel from "./calculator-panel";
import MeasureTools from "./measure-tools";
import { useMeasureTools } from "./use-measure-tools";
import "./edu-tools.css";

const PeriodicTableEs = lazy(() => import("./periodic-table-es"));
const TtsEs = lazy(() => import("./edu-tts"));

type ToolView = "calculadora" | "ciencias" | "medir" | "lectura";

const VIEWS: { id: ToolView; label: string }[] = [
  { id: "calculadora", label: "Calculadora" },
  { id: "ciencias", label: "Ciencias" },
  { id: "medir", label: "Medir" },
  { id: "lectura", label: "Lectura" },
];

/**
 * Herramientas de aula: calculadora con pantalla, memoria e historial y modo
 * científico, ecuaciones por líneas, tabla periódica, medición y lectura en voz
 * alta.
 * @returns La ventana con la vista activa.
 */
export default function EduToolsApp() {
  const [view, setView] = useState<ToolView>("calculadora");
  const measure = useMeasureTools({ active: view === "medir" });

  // Atajos Alt+1…4 para cambiar de vista sin soltar el teclado.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const position = Number(event.key);
      if (!Number.isInteger(position) || position < 1 || position > VIEWS.length) return;
      event.preventDefault();
      setView(VIEWS[position - 1].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="edu-app">
      <div className="edu-app-tabs" role="tablist" aria-label="Herramientas de aula">
        {VIEWS.map((item, index) => (
          <button key={item.id} type="button" role="tab" id={`edu-tab-${item.id}`} aria-selected={view === item.id} aria-controls="edu-tool-panel" className="edu-app-tab" title={`${item.label} (Alt+${index + 1})`} onClick={() => setView(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="edu-app-body" role="tabpanel" id="edu-tool-panel" aria-labelledby={`edu-tab-${view}`}>
        {view === "calculadora" ? (
          <div className="edu-view edu-view--fill">
            <CalculatorPanel />
          </div>
        ) : null}

        {view === "ciencias" ? (
          <div className="edu-view edu-view--fill">
            <section className="edu-card edu-card--periodic">
              <h3 className="edu-card-title">Tabla periódica</h3>
              <Suspense fallback={<p className="edu-hint" role="status">Cargando la tabla periódica…</p>}>
                <PeriodicTableEs />
              </Suspense>
            </section>
          </div>
        ) : null}

        {view === "medir" ? <MeasureTools measure={measure} /> : null}

        {view === "lectura" ? (
          <div className="edu-view edu-view--fill">
            <section className="edu-card edu-card--tts">
              <h3 className="edu-card-title">Lectura en voz alta</h3>
              <div className="edu-tts">
                <Suspense fallback={<p className="edu-hint" role="status">Cargando el lector…</p>}>
                  <TtsEs />
                </Suspense>
              </div>
              <p className="edu-hint">Escribe o pega un texto, elige la voz y pulsa Leer. Usa la voz del sistema, sin enviar nada fuera.</p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
