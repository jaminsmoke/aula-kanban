"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MeasureTool = "regla" | "transportador";
type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };

/** Píxeles por centímetro de la regla (96 ppp / 2,54). */
const PX_PER_CM = 96 / 2.54;
const PX_PER_INCH = 96;

const MIN_RADIUS = 120;
const MAX_RADIUS = 300;
const TURN_STEP = 5;

/**
 * Estado e interacción de regla y transportador.
 * @param props.active - Si la vista Medir está visible.
 * @returns Refs, medidas y handlers de la herramienta.
 */
export function useMeasureTools({ active }: { active: boolean }) {
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
    if (!active) return;
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBoxSize({ width: rect.width, height: rect.height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [active, measureTool]);

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

  return {
    measureTool, setMeasureTool, rotation, setRotation, dragging, boxRef, rigRef, rulerRef, segment, setSegment,
    measureLength, measureLabel, startTurn, turnWithKeyboard, startMeasure, moveMeasure, endMeasure, radius, rigSize,
  };
}

export type MeasureToolsState = ReturnType<typeof useMeasureTools>;
