"use client";

import { lazy, Suspense } from "react";
import "../edu-base.css";
import "./tabla-periodica.css";

const PeriodicTableEs = lazy(() => import("./periodic-table/periodic-table-es"));

/**
 * Tabla periódica en español, con búsqueda, filtros y ficha del elemento.
 * @returns La ventana de la tabla periódica.
 */
export default function TablaPeriodicaApp() {
  return (
    <div className="edu-app">
      <div className="edu-app-body">
        <div className="edu-view edu-view--fill">
          <section className="edu-card edu-card--periodic">
            <h3 className="edu-card-title">Tabla periódica</h3>
            <Suspense fallback={<p className="edu-hint" role="status">Cargando la tabla periódica…</p>}>
              <PeriodicTableEs />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
