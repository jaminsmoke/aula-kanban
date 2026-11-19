"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  clampMermaidPan,
  clampMermaidZoom,
  fitMermaidScale,
  mermaidStageSize,
  mermaidSvgSize,
  zoomMermaidPan,
  type MermaidCanvasSize,
  type MermaidPan,
  type MermaidPoint,
} from "./mermaid-canvas";

/** Propiedades de la vista previa interactiva. */
export type MermaidCanvasViewProps = {
  svg: string;
  error: string | null;
};

type DragState = { startX: number; startY: number; pan: MermaidPan };
type PinchState = { distance: number; scale: number; pan: MermaidPan; anchor: MermaidPoint };

/**
 * Lienzo de Diagramas con ajuste, zoom, paneo y pantalla completa.
 * @param props - SVG renderizado y error de Mermaid.
 * @returns La vista previa interactiva.
 */
export default function MermaidCanvasView({ svg, error }: MermaidCanvasViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, MermaidPoint>());
  const drag = useRef<DragState | null>(null);
  const pinch = useRef<PinchState | null>(null);
  const [canvasSize, setCanvasSize] = useState<MermaidCanvasSize | null>(null);
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [pan, setPan] = useState<MermaidPan>({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const instructionsId = useId();

  const svgSize = useMemo(() => mermaidSvgSize(svg), [svg]);
  const fitScale = useMemo(() => fitMermaidScale(svgSize, canvasSize), [canvasSize, svgSize]);
  const scale = manualScale ?? fitScale;
  const stageSize = useMemo(() => mermaidStageSize(svgSize, scale), [scale, svgSize]);
  const zoomLabel = svg ? `${Math.round(scale * 100)}%` : "—";

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    let frame = 0;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      const style = window.getComputedStyle(element);
      const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      const verticalPadding = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
      const next = {
        width: Math.max(1, element.clientWidth - horizontalPadding),
        height: Math.max(1, element.clientHeight - verticalPadding),
      };
      setCanvasSize((current) => current?.width === next.width && current.height === next.height ? current : next);
    };

    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(element);
    }
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFullscreen(false);
      window.requestAnimationFrame(() => toggleRef.current?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  const centerAnchor = useCallback((): MermaidPoint => ({
    x: (canvasSize?.width ?? 0) / 2,
    y: (canvasSize?.height ?? 0) / 2,
  }), [canvasSize]);

  const zoomTo = useCallback((nextScale: number, anchor: MermaidPoint = centerAnchor()) => {
    const target = clampMermaidZoom(nextScale);
    if (target === scale) return;
    setManualScale(target);
    setPan(clampMermaidPan(
      zoomMermaidPan(pan, scale, target, anchor, canvasSize, svgSize),
      mermaidStageSize(svgSize, target),
      canvasSize,
    ));
  }, [canvasSize, centerAnchor, pan, scale, svgSize]);

  const zoomBy = (factor: number) => {
    zoomTo(scale * factor);
  };

  const resetView = () => {
    setManualScale(null);
    setPan({ x: 0, y: 0 });
  };

  const panBy = (dx: number, dy: number) => {
    setPan((current) => clampMermaidPan(
      { x: current.x + dx, y: current.y + dy },
      stageSize,
      canvasSize,
    ));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!svg) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(1.25);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(0.8);
    } else if (event.key === "0") {
      event.preventDefault();
      resetView();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      panBy(32, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      panBy(-32, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      panBy(0, 32);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      panBy(0, -32);
    }
  };

  useEffect(() => {
    const element = canvasRef.current;
    if (!element || !svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomTo(scale * factor, anchor);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [scale, svg, zoomTo]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!svg || (event.pointerType === "mouse" && event.button !== 0)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 1) {
      drag.current = {
        startX: event.clientX,
        startY: event.clientY,
        pan,
      };
      pinch.current = null;
      setGrabbing(true);
    } else if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      pinch.current = {
        distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
        scale,
        pan,
        anchor: {
          x: (first.x + second.x) / 2 - rect.left,
          y: (first.y + second.y) / 2 - rect.top,
        },
      };
      drag.current = null;
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.max(1, Math.hypot(first.x - second.x, first.y - second.y));
      const target = clampMermaidZoom(pinch.current.scale * (distance / pinch.current.distance));
      setManualScale(target);
      setPan(clampMermaidPan(
        zoomMermaidPan(pinch.current.pan, pinch.current.scale, target, pinch.current.anchor, canvasSize, svgSize),
        mermaidStageSize(svgSize, target),
        canvasSize,
      ));
      return;
    }
    if (!drag.current) return;
    const next = {
      x: drag.current.pan.x + event.clientX - drag.current.startX,
      y: drag.current.pan.y + event.clientY - drag.current.startY,
    };
    setPan(clampMermaidPan(next, stageSize, canvasSize));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      drag.current = null;
      setGrabbing(false);
    }
  };

  const toggleFullscreen = () => {
    const next = !fullscreen;
    setFullscreen(next);
    window.requestAnimationFrame(() => {
      if (next) canvasRef.current?.focus();
      else toggleRef.current?.focus();
    });
  };

  const stageTransform = `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`;

  return (
    <div className={`mermaid-preview${fullscreen ? " is-fullscreen" : ""}`}>
      <div className="mermaid-preview-head">
        <span>Vista previa</span>
        <div className="mermaid-view-controls" role="group" aria-label="Controles de vista">
          <button type="button" onClick={() => zoomBy(0.8)} disabled={!svg} aria-label="Alejar">
            <ZoomOut size={14} aria-hidden />
          </button>
          <span className="mermaid-zoom-level" aria-live="polite">{zoomLabel}</span>
          <button type="button" onClick={() => zoomBy(1.25)} disabled={!svg} aria-label="Acercar">
            <ZoomIn size={14} aria-hidden />
          </button>
          <button type="button" onClick={resetView} disabled={!svg} aria-label="Ajustar al lienzo">
            <RotateCcw size={14} aria-hidden />
          </button>
          <button
            ref={toggleRef}
            type="button"
            onClick={toggleFullscreen}
            disabled={!svg}
            aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-pressed={fullscreen}
          >
            {fullscreen ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
          </button>
        </div>
        {error ? <span className="mermaid-error" role="alert">{error}</span> : null}
      </div>
      <div
        ref={canvasRef}
        className={`mermaid-canvas${grabbing ? " is-grabbing" : ""}`}
        role="region"
        aria-label="Lienzo del diagrama"
        aria-describedby={instructionsId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <p id={instructionsId} className="sr-only">
          Usa más y menos para acercar o alejar, cero para ajustar, las flechas para mover y Escape para salir de pantalla completa.
        </p>
        {svg ? (
          svgSize ? (
            <div
              className="mermaid-canvas-stage"
              style={{
                width: stageSize.width,
                height: stageSize.height,
                transform: stageTransform,
              }}
            >
              <div
                className="mermaid-canvas-svg"
                style={{
                  position: "absolute",
                  inset: "0 auto auto 0",
                  width: svgSize.width,
                  height: svgSize.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          ) : <div className="mermaid-canvas-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : <p className="mermaid-empty">El diagrama aparecerá aquí.</p>}
      </div>
    </div>
  );
}
