/** Margen mínimo entre una ventana y el borde del escritorio. */
export const WINDOW_MARGIN = 12;

/** Ancho mínimo usable de una ventana. */
export const WINDOW_MIN_WIDTH = 240;

/** Alto mínimo usable de una ventana. */
export const WINDOW_MIN_HEIGHT = 180;

/** Ancho a partir del cual el escritorio se considera estrecho. */
export const WINDOW_NARROW_BREAKPOINT = 640;

export type WindowBounds = { width: number; height: number };

export type WindowGeometry = {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

/**
 * Limita un número a un intervalo.
 * @param value - Valor original.
 * @param min - Límite inferior.
 * @param max - Límite superior.
 * @returns El valor ajustado.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Ajusta una ventana a los límites del escritorio, conservando un margen y un
 * tamaño mínimo siempre que el espacio lo permita.
 * @param geometry - Posición y tamaño deseados.
 * @param bounds - Tamaño disponible del escritorio.
 * @returns Una geometría completamente visible.
 */
export function fitWindowGeometry(geometry: WindowGeometry, bounds: WindowBounds): WindowGeometry {
  const maxWidth = Math.max(1, bounds.width - WINDOW_MARGIN * 2);
  const maxHeight = Math.max(1, bounds.height - WINDOW_MARGIN * 2);
  const width = Math.min(Math.max(geometry.size.width, WINDOW_MIN_WIDTH), maxWidth);
  const height = Math.min(Math.max(geometry.size.height, WINDOW_MIN_HEIGHT), maxHeight);
  const minX = Math.min(WINDOW_MARGIN, Math.max(0, bounds.width - width));
  const minY = Math.min(WINDOW_MARGIN, Math.max(0, bounds.height - height));
  const x = clamp(geometry.position.x, minX, bounds.width - width - WINDOW_MARGIN);
  const y = clamp(geometry.position.y, minY, bounds.height - height - WINDOW_MARGIN);
  return { position: { x, y }, size: { width, height } };
}

/**
 * Comprueba si dos geometrías son equivalentes.
 * @param left - Primera geometría.
 * @param right - Segunda geometría.
 * @returns `true` si posición y tamaño coinciden.
 */
export function sameWindowGeometry(left: WindowGeometry, right: WindowGeometry): boolean {
  return left.position.x === right.position.x
    && left.position.y === right.position.y
    && left.size.width === right.size.width
    && left.size.height === right.size.height;
}

/**
 * Indica si el escritorio es demasiado estrecho para una ventana flotante.
 * @param bounds - Tamaño disponible.
 * @returns `true` si conviene abrir la ventana maximizada.
 */
export function isNarrowWindowBounds(bounds: WindowBounds): boolean {
  return bounds.width <= WINDOW_NARROW_BREAKPOINT;
}
