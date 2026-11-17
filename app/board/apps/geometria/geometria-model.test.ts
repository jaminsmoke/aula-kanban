import { describe, expect, it } from "vitest";
import {
  FUNCTIONS,
  PRESETS,
  distance,
  evaluateFunction,
  formatDistance,
  pointName,
  presetInfo,
} from "./geometria-model";

describe("modelo de Geometría interactiva", () => {
  it("nombra los puntos en orden alfabético y después con P", () => {
    expect(pointName(0)).toBe("A");
    expect(pointName(1)).toBe("B");
    expect(pointName(25)).toBe("Z");
    expect(pointName(26)).toBe("P27");
  });

  it("calcula y formatea distancias", () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(formatDistance(5)).toBe("5,00");
    expect(formatDistance(2.345)).toBe("2,35");
  });

  it("describe los presets con sus recuentos", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["libre", "triangulo", "circunferencia", "rectas"]);
    expect(presetInfo("triangulo").pointCount).toBe(3);
    expect(presetInfo("circunferencia").elementCount).toBe(3);
    expect(presetInfo("desconocido" as never)).toEqual(PRESETS[0]);
  });

  it("evalúa las funciones representables", () => {
    expect(FUNCTIONS.map((item) => item.id)).toEqual(["parabola", "seno", "lineal"]);
    expect(evaluateFunction("parabola", 0)).toBe(-2);
    expect(evaluateFunction("seno", Math.PI / 2)).toBeCloseTo(1.5);
    expect(evaluateFunction("lineal", 1)).toBeCloseTo(0.1);
  });
});
