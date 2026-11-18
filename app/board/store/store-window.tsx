"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { m } from "motion/react";
import { useWindowAttemptClose, WindowCloseProvider } from "./window-close-guard";

/**
 * Botón de cierre que respeta la guarda registrada por la app.
 * @param props.title - Título de la ventana.
 * @returns El botón de cierre.
 */
function WindowCloseButton({ title }: { title: string }) {
  const attemptClose = useWindowAttemptClose();
  return (
    <button
      type="button"
      className="store-traffic store-traffic-close"
      aria-label={`Cerrar ${title}`}
      onClick={attemptClose}
    />
  );
}

/**
 * Ventana estilo macOS: barra de título con botones de cerrar,
 * minimizar y ampliar (semáforo), arrastrable y redimensionable
 * desde la esquina inferior derecha, con foco al pulsar.
 * @param props - Título, posición, tamaño, límites y acciones de la ventana.
 * @returns La ventana con su contenido.
 */
export default function StoreWindow({
  title, position, size, bounds, zIndex, maximized, minimized, onMove, onResize, onFocus, onClose, onMinimize, onZoom, children,
}: {
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  bounds: { width: number; height: number };
  zIndex: number;
  maximized: boolean;
  minimized: boolean;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  children: ReactNode;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (maximized) return;
    if ((event.target as HTMLElement).closest(".store-window-controls")) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    onFocus();
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (!drag.current) return;
      const width = bounds.width || window.innerWidth;
      const height = bounds.height || window.innerHeight;
      onMove({
        x: Math.max(-size.width + 120, Math.min(moveEvent.clientX - drag.current.dx, width - 120)),
        y: Math.max(0, Math.min(moveEvent.clientY - drag.current.dy, height - 40)),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    const start = { x: event.clientX, y: event.clientY, width: size.width, height: size.height };
    const move = (moveEvent: globalThis.PointerEvent) => {
      const widthLimit = bounds.width || window.innerWidth;
      const heightLimit = bounds.height || window.innerHeight;
      const maxWidth = Math.max(180, widthLimit - position.x);
      const maxHeight = Math.max(140, heightLimit - position.y);
      onResize({
        width: Math.max(Math.min(560, maxWidth), Math.min(start.width + moveEvent.clientX - start.x, maxWidth)),
        height: Math.max(Math.min(380, maxHeight), Math.min(start.height + moveEvent.clientY - start.y, maxHeight)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <WindowCloseProvider onClose={onClose}>
      <m.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={`store-window${maximized ? " store-window--maximized" : ""}`}
        role="dialog"
        aria-label={title}
        style={{ left: position.x, top: position.y, zIndex, width: size.width, height: size.height, borderRadius: maximized ? 0 : undefined, display: minimized ? "none" : undefined }}
        onPointerDown={onFocus}
      >
        <div className="store-window-titlebar" onPointerDown={startDrag}>
          <div className="store-window-controls">
            <WindowCloseButton title={title} />
            <button type="button" className="store-traffic store-traffic-minimize" aria-label={`Minimizar ${title}`} onClick={onMinimize} />
            <button type="button" className="store-traffic store-traffic-zoom" aria-label={`${maximized ? "Reducir" : "Ampliar"} ${title}`} onClick={onZoom} />
          </div>
          <span className="store-window-title">{title}</span>
        </div>
        <div className="store-window-body">{children}</div>
        {!maximized && <div className="store-resize" onPointerDown={startResize} aria-hidden />}
      </m.div>
    </WindowCloseProvider>
  );
}
