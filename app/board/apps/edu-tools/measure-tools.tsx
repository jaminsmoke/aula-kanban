"use client";

import { lazy, Suspense } from "react";
import type { MeasureToolsState } from "./use-measure-tools";

const Ruler = lazy(() => import("@smst/edu-tools/ruler").then((module) => ({ default: module.Ruler })));
const Protractor = lazy(() => import("@smst/edu-tools/protractor").then((module) => ({ default: module.Protractor })));

/**
 * Vista Medir: regla y transportador.
 * @param props.measure - Estado y handlers de la herramienta.
 * @returns La vista de medición.
 */
export default function MeasureTools({ measure }: { measure: MeasureToolsState }) {
  const {
    measureTool, setMeasureTool, rotation, setRotation, dragging, boxRef, rigRef, rulerRef, segment, setSegment,
    measureLength, measureLabel, startTurn, turnWithKeyboard, startMeasure, moveMeasure, endMeasure, radius, rigSize,
  } = measure;

  return (
    <div className="edu-view edu-view--medir">
      <div className="edu-segmented" role="group" aria-label="Instrumento de medida">
        <button type="button" aria-pressed={measureTool === "regla"} onClick={() => setMeasureTool("regla")}>Regla</button>
        <button type="button" aria-pressed={measureTool === "transportador"} onClick={() => setMeasureTool("transportador")}>Transportador</button>
      </div>

      {measureTool === "regla" ? (
        <section className="edu-card edu-card--ruler">
          <div className="edu-card-head">
            <h3 className="edu-card-title">Regla</h3>
            {segment ? (
              <div className="edu-turn-info">
                <span>{measureLabel}</span>
                <button type="button" onClick={() => setSegment(null)}>Limpiar</button>
              </div>
            ) : null}
          </div>
          <div
            className="edu-ruler"
            ref={rulerRef}
            onPointerDown={startMeasure}
            onPointerMove={moveMeasure}
            onPointerUp={endMeasure}
            onPointerCancel={endMeasure}
          >
            <Suspense fallback={<p className="edu-hint" role="status">Cargando la regla…</p>}>
              <Ruler />
            </Suspense>
            {segment ? (
              <svg className="edu-ruler-overlay" aria-hidden>
                <line x1={segment.a.x} y1={segment.a.y} x2={segment.b.x} y2={segment.b.y} />
                <circle cx={segment.a.x} cy={segment.a.y} r="4" />
                <circle cx={segment.b.x} cy={segment.b.y} r="4" />
              </svg>
            ) : null}
            {segment && measureLength > 2 ? (
              <span className="edu-ruler-readout" style={{ left: (segment.a.x + segment.b.x) / 2, top: (segment.a.y + segment.b.y) / 2 }}>
                {measureLabel}
              </span>
            ) : null}
          </div>
          <p className="edu-hint">Arrastra sobre la regla para medir una distancia; el resultado sale en centímetros y pulgadas.</p>
        </section>
      ) : (
        <section className="edu-card edu-card--protractor">
          <div className="edu-card-head">
            <h3 className="edu-card-title">Transportador</h3>
            <div className="edu-turn-info">
              <span aria-live="polite">{Math.round(rotation)}°</span>
              <button type="button" onClick={() => setRotation(0)}>Reiniciar</button>
            </div>
          </div>
          <div className="edu-protractor-box" ref={boxRef}>
            <div className="edu-protractor-rig" ref={rigRef} style={{ width: rigSize, height: rigSize }}>
              <span className="edu-protractor-guide" aria-hidden />
              <div className="edu-protractor-turn" style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}>
                <Suspense fallback={<p className="edu-hint" role="status">Cargando el transportador…</p>}>
                  <Protractor radiusPx={radius} />
                </Suspense>
                <button
                  type="button"
                  role="slider"
                  className={`edu-protractor-knob${dragging ? " is-dragging" : ""}`}
                  aria-label="Girar transportador"
                  aria-valuenow={Math.round(rotation)}
                  aria-valuemin={0}
                  aria-valuemax={359}
                  aria-valuetext={`${Math.round(rotation)} grados`}
                  title="Arrastra para girar (Shift: precisión de 1°)"
                  onPointerDown={startTurn}
                  onKeyDown={turnWithKeyboard}
                />
              </div>
            </div>
          </div>
          <p className="edu-hint">Arrastra el punto para girar. Flechas ±5°, con Shift ±1° y Home para reiniciar.</p>
        </section>
      )}
    </div>
  );
}
