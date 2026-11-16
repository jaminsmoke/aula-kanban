"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import CalculatorPanel from "./calculator/calculator-panel";
import "./edu-tools.css";

const PeriodicTableEs = lazy(() => import("./periodic-table/periodic-table-es"));

type ToolView = "calculadora" | "tabla-periodica";

const VIEWS: { id: ToolView; label: string }[] = [
  { id: "calculadora", label: "Calculadora" },
  { id: "tabla-periodica", label: "Tabla periódica" },
];

/**
 * Herramientas de aula: calculadora con pantalla, memoria e historial y modo
 * científico, ecuaciones por líneas y tabla periódica.
 * @returns La ventana con la vista activa.
 */
export default function EduToolsApp() {
  const [view, setView] = useState<ToolView>("calculadora");

  // Atajos Alt+1…2 para cambiar de vista sin soltar el teclado.
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

        {view === "tabla-periodica" ? (
          <div className="edu-view edu-view--fill">
            <section className="edu-card edu-card--periodic">
              <h3 className="edu-card-title">Tabla periódica</h3>
              <Suspense fallback={<p className="edu-hint" role="status">Cargando la tabla periódica…</p>}>
                <PeriodicTableEs />
              </Suspense>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
