"use client";

import "@smst/edu-tools/styles";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import CalculatorPanel from "./calculator-panel";
import "./edu-tools.css";

const PeriodicTableEs = lazy(() => import("./periodic-table-es"));
const TtsEs = lazy(() => import("./edu-tts"));
const Ruler = lazy(() => import("@smst/edu-tools/ruler").then((module) => ({ default: module.Ruler })));
const Protractor = lazy(() => import("@smst/edu-tools/protractor").then((module) => ({ default: module.Protractor })));

type ToolView = "calculadora" | "ciencias" | "medir" | "lectura";
type MeasureTool = "regla" | "transportador";
type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };

const VIEWS: { id: ToolView; label: string }[] = [
  { id: "calculadora", label: "Calculadora" },
  { id: "ciencias", label: "Ciencias" },
  { id: "medir", label: "Medir" },
  { id: "lectura", label: "Lectura" },
];

/** Píxeles por centímetro de la regla (96 ppp / 2,54). */
const PX_PER_CM = 96 / 2.54;
const PX_PER_INCH = 96;

const MIN_RADIUS = 120;
const MAX_RADIUS = 300;
const TURN_STEP = 5;

/**
 * Herramientas de aula: calculadora con pantalla, memoria e historial y modo
 * científico, ecuaciones por líneas, tabla periódica, medición y lectura en voz
 * alta.
 * @returns La ventana con la vista activa.
 */
export default function EduToolsApp() {
  const [view, setView] = useState<ToolView>("calculadora");
  const [measureTool, setMeasureTool] = useState<MeasureTool>("regla");
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [segment, setSegment] = useState<Segment | null>(null);
  const [drawing, setDrawing] = useState(false);

  // El transportador se dibuja en un cuadrado para poder girarlo entero sin
  // salirse de la tarjeta; el radio se adapta a ese cuadrado.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBoxSize({ width: rect.width, height: rect.height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [view, measureTool]);

  const radius = Math.max(
    MIN_RADIUS,
    Math.min(MAX_RADIUS, Math.floor((Math.min(boxSize.width, boxSize.height || Infinity) - 60) / 2)),
  );
  const rigSize = radius * 2 + 60;

  /** Convierte la posición del puntero en grados de giro (arriba = 0°). */
  const turnTo = useCallback((clientX: number, clientY: number, exact: boolean) => {
    const rig = rigRef.current;
    if (!rig) return;
    const rect = rig.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
    const step = exact ? 1 : TURN_STEP;
    const next = Math.round((angle + 90) / step) * step;
    setRotation(((next % 360) + 360) % 360);
  }, []);

  const startTurn = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(true);
    turnTo(event.clientX, event.clientY, event.shiftKey);
    const move = (moveEvent: PointerEvent) => turnTo(moveEvent.clientX, moveEvent.clientY, moveEvent.shiftKey);
    const end = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const turnWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setRotation(0);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.shiftKey ? 1 : TURN_STEP;
    setRotation((current) => (current + (event.key === "ArrowRight" ? step : -step) + 360) % 360);
  };

  /**
   * Coordenadas locales del puntero dentro de la regla.
   * @param event - Evento de puntero sobre la regla.
   * @returns Punto relativo a la esquina superior izquierda de la regla.
   */
  const rulerPoint = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = rulerRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };

  const startMeasure = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = rulerPoint(event);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* jsdom no lo implementa */ }
    setDrawing(true);
    setSegment({ a: start, b: start });
  };

  const moveMeasure = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing) return;
    setSegment((current) => (current ? { a: current.a, b: rulerPoint(event) } : current));
  };

  const endMeasure = () => setDrawing(false);

  const measureLength = segment ? Math.hypot(segment.b.x - segment.a.x, segment.b.y - segment.a.y) : 0;
  const measureLabel = `${(measureLength / PX_PER_CM).toFixed(1)} cm · ${(measureLength / PX_PER_INCH).toFixed(2)} in`;

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

        {view === "medir" ? (
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
        ) : null}

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
