import { describe, expect, it } from "vitest";
import { MINIATURA_MAX_WIDTH, calcularDimensionesMiniatura } from "./thumbnail";

describe("dimensiones de la miniatura", () => {
  it("reduce una foto horizontal conservando la proporción", () => {
    expect(calcularDimensionesMiniatura({ width: 4032, height: 3024 })).toEqual({ width: 800, height: 600, scale: 800 / 4032 });
  });

  it("reduce una foto vertical por el ancho", () => {
    expect(calcularDimensionesMiniatura({ width: 1080, height: 1920 })).toEqual({ width: 800, height: 1422, scale: 800 / 1080 });
  });

  it("no amplía una imagen que ya cabe", () => {
    expect(calcularDimensionesMiniatura({ width: 640, height: 480 })).toEqual({ width: 640, height: 480, scale: 1 });
  });

  it("admite un ancho máximo distinto", () => {
    expect(calcularDimensionesMiniatura({ width: 2000, height: 1000, maxWidth: 500 })).toEqual({ width: 500, height: 250, scale: 0.25 });
  });

  it("nunca devuelve un lado de cero píxeles", () => {
    expect(calcularDimensionesMiniatura({ width: 10_000, height: 1 })).toEqual({ width: 800, height: 1, scale: 0.08 });
  });

  it("rechaza dimensiones no finitas o no positivas", () => {
    for (const input of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: -100, height: 100 },
      { width: Number.NaN, height: 100 },
      { width: 100, height: Number.POSITIVE_INFINITY },
      { width: 100, height: 100, maxWidth: 0 },
      { width: 100, height: 100, maxWidth: -1 },
    ]) {
      expect(calcularDimensionesMiniatura(input), JSON.stringify(input)).toBeNull();
    }
  });

  it("expone el ancho máximo por defecto", () => {
    expect(MINIATURA_MAX_WIDTH).toBe(800);
  });
});
