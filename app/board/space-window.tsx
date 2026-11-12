"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { m } from "motion/react";

/**
 * Ventana estilo macOS: barra de título con botones de cerrar,
 * minimizar y ampliar (semáforo), arrastrable y redimensionable
 * desde la esquina inferior derecha, con foco al pulsar.
 * @param props - Título, posición, tamaño, orden y acciones de la ventana.
 * @returns La ventana con su contenido.
 */
export default function SpaceWindow({
  title, position, size, zIndex, maximized, minimized, onMove, onResize, onFocus, onClose, onMinimize, onZoom, children,
}: {
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
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
    if ((event.target as HTMLElement).closest(".space-window-controls")) return;
    drag.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    onFocus();
    const move = (moveEvent: globalThis.PointerEvent) => {
      if (!drag.current) return;
      onMove({
        x: Math.max(-size.width + 120, Math.min(moveEvent.clientX - drag.current.dx, window.innerWidth - 120)),
        y: Math.max(0, moveEvent.clientY - drag.current.dy),
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
      onResize({
        width: Math.max(560, Math.min(start.width + moveEvent.clientX - start.x, window.innerWidth - position.x)),
        height: Math.max(380, Math.min(start.height + moveEvent.clientY - start.y, window.innerHeight - position.y)),
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
    <m.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-window"
      role="dialog"
      aria-label={title}
      style={{ left: position.x, top: position.y, zIndex, width: size.width, height: size.height, borderRadius: maximized ? 0 : undefined, display: minimized ? "none" : undefined }}
      onPointerDown={onFocus}
    >
      <div className="space-window-titlebar" onPointerDown={startDrag}>
        <div className="space-window-controls">
          <button type="button" className="space-traffic space-traffic-close" aria-label={`Cerrar ${title}`} onClick={onClose} />
          <button type="button" className="space-traffic space-traffic-minimize" aria-label={`Minimizar ${title}`} onClick={onMinimize} />
          <button type="button" className="space-traffic space-traffic-zoom" aria-label={`${maximized ? "Reducir" : "Ampliar"} ${title}`} onClick={onZoom} />
        </div>
        <span className="space-window-title">{title}</span>
      </div>
      <div className="space-window-body">{children}</div>
      {!maximized && <div className="space-resize" onPointerDown={startResize} aria-hidden />}
    </m.div>
  );
}
