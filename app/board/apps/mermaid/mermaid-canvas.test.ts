import { describe, expect, it } from "vitest";
import {
  clampMermaidPan,
  clampMermaidZoom,
  fitMermaidScale,
  mermaidStageSize,
  mermaidSvgSize,
  zoomMermaidPan,
} from "./mermaid-canvas";

describe("lienzo de Diagramas", () => {
  it("lee el tamaño del viewBox y prefiere sus dimensiones", () => {
    expect(mermaidSvgSize('<svg width="10" height="20" viewBox="0 0 320 200"><g /></svg>'))
      .toEqual({ width: 320, height: 200 });
  });

  it("usa width y height si no hay viewBox", () => {
    expect(mermaidSvgSize('<svg width="640px" height="360px"><g /></svg>'))
      .toEqual({ width: 640, height: 360 });
  });

  it("devuelve null sin un SVG medible", () => {
    expect(mermaidSvgSize("")).toBeNull();
    expect(mermaidSvgSize("<div />")).toBeNull();
    expect(mermaidSvgSize('<svg width="0" height="10" />')).toBeNull();
  });

  it("encaja un diagrama ancho sin ampliarlo por encima del 100 %", () => {
    expect(fitMermaidScale({ width: 2000, height: 1000 }, { width: 800, height: 600 })).toBe(0.4);
    expect(fitMermaidScale({ width: 200, height: 100 }, { width: 800, height: 600 })).toBe(1);
  });

  it("respeta el alto cuando es el límite", () => {
    expect(fitMermaidScale({ width: 100, height: 1000 }, { width: 800, height: 300 })).toBe(0.3);
  });

  it("mantiene un mínimo seguro y evita escalas inválidas", () => {
    expect(fitMermaidScale({ width: 100_000, height: 100_000 }, { width: 100, height: 100 })).toBe(0.02);
    expect(fitMermaidScale(null, { width: 800, height: 600 })).toBe(1);
    expect(fitMermaidScale({ width: 100, height: 100 }, { width: 0, height: 600 })).toBe(1);
  });

  it("limita el zoom interactivo y calcula el escenario", () => {
    expect(clampMermaidZoom(0.001)).toBe(0.05);
    expect(clampMermaidZoom(99)).toBe(4);
    expect(clampMermaidZoom(Number.NaN)).toBe(1);
    expect(mermaidStageSize({ width: 400, height: 200 }, 0.5)).toEqual({ width: 200, height: 100 });
  });

  it("limita el desplazamiento a los bordes visibles", () => {
    expect(clampMermaidPan({ x: 500, y: -500 }, { width: 500, height: 400 }, { width: 300, height: 200 }))
      .toEqual({ x: 100, y: -100 });
    expect(clampMermaidPan({ x: 20, y: -20 }, { width: 200, height: 100 }, { width: 300, height: 200 }))
      .toEqual({ x: 0, y: 0 });
  });

  it("mantiene el centro al ampliar alrededor del centro", () => {
    expect(zoomMermaidPan({ x: 0, y: 0 }, 1, 2, { x: 300, y: 200 }, { width: 600, height: 400 }, { width: 400, height: 200 }))
      .toEqual({ x: 0, y: 0 });
  });

  it("conserva el punto bajo el cursor al ampliar", () => {
    expect(zoomMermaidPan({ x: 0, y: 0 }, 1, 2, { x: 400, y: 200 }, { width: 600, height: 400 }, { width: 800, height: 500 }))
      .toEqual({ x: -100, y: 0 });
  });
});
