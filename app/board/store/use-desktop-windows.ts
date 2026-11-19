"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreTool } from "./tools";
import {
  fitWindowGeometry,
  isNarrowWindowBounds,
  sameWindowGeometry,
  WINDOW_MARGIN,
  type WindowBounds,
} from "./window-geometry";

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
 * Ajusta las ventanas abiertas a un nuevo tamaño de escritorio.
 * @param windows - Ventanas actuales.
 * @param bounds - Nuevo espacio disponible.
 * @returns Las ventanas con geometría segura, conservando las que ya encajan.
 */
function reflowWindows(windows: DesktopWindow[], bounds: WindowBounds): DesktopWindow[] {
  let changed = false;
  const next = windows.map((item) => {
    if (item.maximized) {
      if (!item.saved) return item;
      const saved = fitWindowGeometry(item.saved, bounds);
      if (sameWindowGeometry(item.saved, saved)) return item;
      changed = true;
      return { ...item, saved };
    }
    const geometry = fitWindowGeometry(item, bounds);
    if (sameWindowGeometry(item, geometry)) return item;
    changed = true;
    return { ...item, position: geometry.position, size: geometry.size };
  });
  return changed ? next : windows;
}

/**
 * Devuelve el tamaño del escritorio si ya está medido.
 * @param bounds - Medida observada.
 * @returns Los límites válidos o `null` si aún no hay medidas.
 */
function measuredBounds(bounds: WindowBounds): WindowBounds | null {
  return bounds.width > 0 && bounds.height > 0 ? bounds : null;
}

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
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = { width: rect.width, height: rect.height };
      setDesktopSize((current) => current.width === next.width && current.height === next.height ? current : next);
      setWindows((current) => reflowWindows(current, next));
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
      const preferred = tool.window;
      const rect = desktopRef.current?.getBoundingClientRect();
      const bounds: WindowBounds = rect && rect.width > 0 && rect.height > 0
        ? { width: rect.width, height: rect.height }
        : { width: window.innerWidth, height: window.innerHeight };
      const desiredWidth = Math.min(preferred.width, Math.max(1, bounds.width - WINDOW_MARGIN * 2));
      const offset = Math.max(
        WINDOW_MARGIN,
        Math.min(150 + current.length * 30, bounds.width - desiredWidth - WINDOW_MARGIN),
      );
      const geometry = fitWindowGeometry({
        position: { x: offset, y: WINDOW_MARGIN },
        size: preferred,
      }, bounds);
      const narrow = isNarrowWindowBounds(bounds);
      return [...current, {
        tool,
        minimized: false,
        position: narrow ? { x: 0, y: 0 } : geometry.position,
        size: narrow ? { width: bounds.width, height: bounds.height } : geometry.size,
        maximized: narrow,
        saved: narrow ? { position: geometry.position, size: geometry.size } : undefined,
        zIndex: zCounter.current,
      }];
    });
  }, []);

  const focus = useCallback((id: string) => setWindows((current) => {
    zCounter.current += 1;
    return current.map((item) => (item.tool.id === id ? { ...item, zIndex: zCounter.current } : item));
  }), []);
  const close = useCallback((id: string) => setWindows((current) => current.filter((item) => item.tool.id !== id)), []);
  const minimize = useCallback((id: string) => setWindows((current) => current.map((item) => (item.tool.id === id ? { ...item, minimized: true } : item))), []);
  const move = useCallback((id: string, position: { x: number; y: number }) => setWindows((current) => {
    const bounds = measuredBounds(desktopSize);
    return current.map((item) => {
      if (item.tool.id !== id || item.maximized || !bounds) return item;
      const geometry = fitWindowGeometry({ position, size: item.size }, bounds);
      return sameWindowGeometry(item, geometry)
        ? item
        : { ...item, position: geometry.position, size: geometry.size };
    });
  }), [desktopSize]);
  const resize = useCallback((id: string, size: { width: number; height: number }) => setWindows((current) => {
    const bounds = measuredBounds(desktopSize);
    return current.map((item) => {
      if (item.tool.id !== id || item.maximized || !bounds) return item;
      const geometry = fitWindowGeometry({ position: item.position, size }, bounds);
      return sameWindowGeometry(item, geometry)
        ? item
        : { ...item, position: geometry.position, size: geometry.size };
    });
  }), [desktopSize]);
  const zoom = useCallback((id: string) => setWindows((current) => current.map((item) => {
    if (item.tool.id !== id) return item;
    const bounds = measuredBounds(desktopSize) ?? {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    if (item.maximized) {
      const restored = fitWindowGeometry(item.saved ?? item, bounds);
      return { ...item, maximized: false, position: restored.position, size: restored.size, saved: undefined };
    }
    const rect = desktopRef.current?.getBoundingClientRect();
    return {
      ...item,
      maximized: true,
      saved: { position: item.position, size: item.size },
      position: { x: 0, y: 0 },
      size: { width: rect?.width ?? bounds.width, height: rect?.height ?? bounds.height },
    };
  })), [desktopSize]);
  const restore = useCallback((id: string) => setWindows((current) => {
    zCounter.current += 1;
    return current.map((item) => (item.tool.id === id
      ? { ...item, minimized: false, zIndex: zCounter.current }
      : item));
  }), []);

  return { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom };
}
