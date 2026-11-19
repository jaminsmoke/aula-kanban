import { describe, expect, it } from "vitest";
import { fitMermaidScale, mermaidSvgSize } from "./mermaid-canvas";

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
});
