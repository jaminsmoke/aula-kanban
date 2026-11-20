"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { MermaidErrorInfo } from "./mermaid-error";

type MermaidBlockPreviewProps = {
  svg: string;
  error: MermaidErrorInfo | null;
  loading: boolean;
  visible: boolean;
  previewCode: string;
  editing: boolean;
  readOnly: boolean;
  onJumpToErrorLine: (line: number) => void;
};

/**
 * Vista previa del diagrama con zoom, desplazamiento y errores.
 * @param props - Resultado del render y acciones.
 * @returns La vista previa.
 */
export function MermaidBlockPreview({
  svg,
  error,
  loading,
  visible,
  previewCode,
  editing,
  readOnly,
  onJumpToErrorLine,
}: MermaidBlockPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  /**
   * Cambia el zoom entre el 100 % y el 300 %.
   * @param direction - `1` acerca y `-1` aleja.
   */
  function changeZoom(direction: -1 | 1) {
    setZoom((current) => Math.min(3, Math.max(1, Number((current + direction * 0.25).toFixed(2)))));
  }

  /**
   * Vuelve al 100 % y al inicio de la vista.
   */
  function resetZoom() {
    setZoom(1);
    if (previewRef.current) {
      previewRef.current.scrollLeft = 0;
      previewRef.current.scrollTop = 0;
    }
  }

  /**
   * Empieza el arrastre del diagrama ampliado.
   * @param event - Evento de puntero.
   */
  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    const element = previewRef.current;
    if (!element || zoom <= 1) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    };
    element.setPointerCapture?.(event.pointerId);
  }

  /**
   * Desplaza la vista mientras se arrastra el diagrama.
   * @param event - Evento de puntero.
   */
  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const element = previewRef.current;
    const drag = dragRef.current;
    if (!element || !drag) return;
    element.scrollLeft = drag.left - (event.clientX - drag.x);
    element.scrollTop = drag.top - (event.clientY - drag.y);
  }

  /**
   * Termina el arrastre del diagrama.
   */
  function endPan() {
    dragRef.current = null;
  }

  return (
    <>
      {svg && !loading && !error ? (
        <div className="aula-mermaid-zoom-controls" role="group" aria-label="Controles de zoom del diagrama">
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => changeZoom(-1)}
            disabled={zoom <= 1}
            aria-label="Alejar diagrama"
            title="Alejar diagrama"
          >
            <ZoomOut size={14} aria-hidden />
          </button>
          <span className="aula-mermaid-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => changeZoom(1)}
            disabled={zoom >= 3}
            aria-label="Acercar diagrama"
            title="Acercar diagrama"
          >
            <ZoomIn size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={resetZoom}
            disabled={zoom === 1}
            aria-label="Restablecer zoom"
            title="Restablecer zoom"
          >
            <RotateCcw size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="aula-mermaid-action icon"
            onClick={() => { void previewRef.current?.requestFullscreen?.(); }}
            aria-label="Ver diagrama en pantalla completa"
            title="Pantalla completa"
          >
            <Maximize2 size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        className={`aula-mermaid-preview${zoom > 1 ? " is-zoomed" : ""}`}
        aria-busy={loading}
        aria-label="Vista previa del diagrama Mermaid"
        role="group"
        tabIndex={zoom > 1 ? 0 : -1}
        ref={previewRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
        onKeyDown={(event) => {
          const element = previewRef.current;
          if (!element || zoom <= 1) return;
          const step = 28;
          if (event.key === "ArrowLeft") { event.preventDefault(); element.scrollLeft -= step; }
          if (event.key === "ArrowRight") { event.preventDefault(); element.scrollLeft += step; }
          if (event.key === "ArrowUp") { event.preventDefault(); element.scrollTop -= step; }
          if (event.key === "ArrowDown") { event.preventDefault(); element.scrollTop += step; }
        }}
      >
        {!visible ? (
          <p className="aula-mermaid-state">El diagrama se dibujará al acercarte.</p>
        ) : loading ? (
          <p className="aula-mermaid-state">
            <Loader2 size={15} className="aula-mermaid-spin" aria-hidden />
            Dibujando…
          </p>
        ) : error ? (
          <div className="aula-mermaid-error" role="alert">
            <strong>{error.summary}</strong>
            <pre className="aula-mermaid-error-detail">{error.detail}</pre>
            {error.line && !readOnly ? (
              <button type="button" className="aula-mermaid-action" onClick={() => onJumpToErrorLine(error.line ?? 1)}>
                Ir a la línea {error.line}
              </button>
            ) : null}
          </div>
        ) : svg ? (
          <div className="aula-mermaid-zoom" data-zoom={zoom} style={{ width: `${zoom * 100}%` }}>
            <div className="aula-mermaid-svg" role="img" aria-label="Diagrama Mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        ) : (
          <p className="aula-mermaid-state">
            {!previewCode.trim()
              ? editing
                ? "Escribe código Mermaid para ver la vista previa."
                : "El diagrama está vacío."
              : "El diagrama aparecerá aquí."}
          </p>
        )}
      </div>
    </>
  );
}
