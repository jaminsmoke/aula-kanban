import { describe, expect, it } from "vitest";
import {
  fitWindowGeometry,
  isNarrowWindowBounds,
  sameWindowGeometry,
  WINDOW_MARGIN,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_NARROW_BREAKPOINT,
} from "./window-geometry";

describe("geometría de ventanas", () => {
  it("conserva una ventana que ya cabe en el escritorio", () => {
    const geometry = {
      position: { x: 150, y: 80 },
      size: { width: 880, height: 560 },
    };

    expect(fitWindowGeometry(geometry, { width: 1200, height: 800 })).toEqual(geometry);
  });

  it("reduce y recoloca una ventana cuando el escritorio se estrecha", () => {
    const geometry = fitWindowGeometry({
      position: { x: 150, y: 12 },
      size: { width: 900, height: 600 },
    }, { width: 390, height: 680 });

    expect(geometry).toEqual({
      position: { x: WINDOW_MARGIN, y: WINDOW_MARGIN },
      size: { width: 366, height: 600 },
    });
  });

  it("impone el tamaño mínimo cuando hay espacio suficiente", () => {
    const geometry = fitWindowGeometry({
      position: { x: 20, y: 20 },
      size: { width: 80, height: 90 },
    }, { width: 1200, height: 800 });

    expect(geometry.size).toEqual({ width: WINDOW_MIN_WIDTH, height: WINDOW_MIN_HEIGHT });
  });

  it("corrige posiciones negativas o fuera del borde derecho", () => {
    const negative = fitWindowGeometry({
      position: { x: -40, y: -20 },
      size: { width: 400, height: 300 },
    }, { width: 800, height: 600 });
    const right = fitWindowGeometry({
      position: { x: 790, y: 570 },
      size: { width: 400, height: 300 },
    }, { width: 800, height: 600 });

    expect(negative.position).toEqual({ x: WINDOW_MARGIN, y: WINDOW_MARGIN });
    expect(right.position).toEqual({ x: 388, y: 288 });
  });

  it("cabe en un escritorio más pequeño que los márgenes y mínimos", () => {
    const geometry = fitWindowGeometry({
      position: { x: 100, y: 100 },
      size: { width: 900, height: 600 },
    }, { width: 20, height: 18 });

    expect(geometry.size).toEqual({ width: 1, height: 1 });
    expect(geometry.position.x).toBeGreaterThanOrEqual(0);
    expect(geometry.position.y).toBeGreaterThanOrEqual(0);
    expect(geometry.position.x + geometry.size.width).toBeLessThanOrEqual(20);
    expect(geometry.position.y + geometry.size.height).toBeLessThanOrEqual(18);
  });

  it("detecta geometrías equivalentes", () => {
    const geometry = { position: { x: 12, y: 12 }, size: { width: 366, height: 656 } };

    expect(sameWindowGeometry(geometry, { ...geometry, position: { ...geometry.position } })).toBe(true);
    expect(sameWindowGeometry(geometry, { ...geometry, size: { ...geometry.size, width: 367 } })).toBe(false);
  });

  it("marca como estrecho el escritorio que llega al umbral móvil", () => {
    expect(isNarrowWindowBounds({ width: WINDOW_NARROW_BREAKPOINT, height: 700 })).toBe(true);
    expect(isNarrowWindowBounds({ width: WINDOW_NARROW_BREAKPOINT + 1, height: 700 })).toBe(false);
  });
});
