"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreTool } from "./tools";
import { toolWindow } from "../apps/registry";

/** Ventana abierta en un escritorio: app, estado y geometría. */
export type DesktopWindow = {
  tool: StoreTool;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  saved?: { position: { x: number; y: number }; size: { width: number; height: number } };
  zIndex: number;
};

/**
 * Gestión de ventanas de un escritorio: abrir, enfocar, cerrar,
 * minimizar, restaurar, arrastrar, redimensionar y ampliar, con el
 * tamaño del escritorio observado por `ResizeObserver`. Lo comparten
 * el escritorio de Tienda y el de la mochila/maletín, que muestran el
 * mismo comportamiento de ventana.
 * @returns El estado y las acciones de las ventanas del escritorio.
 */
export function useDesktopWindows() {
  const [windows, setWindows] = useState<DesktopWindow[]>([]);
  const desktopRef = useRef<HTMLDivElement>(null);
  const [desktopSize, setDesktopSize] = useState({ width: 0, height: 0 });
  const zCounter = useRef(10);

  // La ventana vive dentro del contenido del workspace, no en el viewport:
  // observa su caja para mantener las ventanas ampliadas dentro.
  useEffect(() => {
    const element = desktopRef.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setDesktopSize({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const open = useCallback((tool: StoreTool) => {
    setWindows((current) => {
      const existing = current.find((item) => item.tool.id === tool.id);
      zCounter.current += 1;
      if (existing) {
        return current.map((item) => (item.tool.id === tool.id ? { ...item, minimized: false, zIndex: zCounter.current } : item));
      }
      const preferred = toolWindow(tool.id);
      const rect = desktopRef.current?.getBoundingClientRect();
      const areaWidth = Math.max(280, rect?.width ?? window.innerWidth);
      const areaHeight = Math.max(240, rect?.height ?? window.innerHeight);
      const width = Math.min(preferred.width, Math.max(240, areaWidth - 24));
      const height = Math.min(preferred.height, Math.max(200, areaHeight - 24));
      const offset = Math.max(12, Math.min(150 + current.length * 30, areaWidth - width - 12));
      const position = { x: offset, y: 12 };
      const size = { width, height };
      return [...current, { tool, minimized: false, position, size, maximized: false, zIndex: zCounter.current }];
    });
  }, []);

  const focus = useCallback((id: string) => setWindows((current) => {
    zCounter.current += 1;
    return current.map((item) => (item.tool.id === id ? { ...item, zIndex: zCounter.current } : item));
  }), []);
  const close = useCallback((id: string) => setWindows((current) => current.filter((item) => item.tool.id !== id)), []);
  const minimize = useCallback((id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: true } : item))), []);
  const move = useCallback((id: string, position: { x: number; y: number }) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, position } : item))), []);
  const resize = useCallback((id: string, size: { width: number; height: number }) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, size } : item))), []);
  const zoom = useCallback((id: string) => setWindows((current) => current.map((item) => {
    if (item.tool.id !== id) return item;
    if (item.maximized && item.saved) return { ...item, maximized: false, position: item.saved.position, size: item.saved.size, saved: undefined };
    const rect = desktopRef.current?.getBoundingClientRect();
    return {
      ...item,
      maximized: true,
      saved: { position: item.position, size: item.size },
      position: { x: 0, y: 0 },
      size: { width: rect?.width ?? window.innerWidth, height: rect?.height ?? window.innerHeight },
    };
  })), []);
  const restore = useCallback((id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: false } : item))), []);

  return { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom };
}
