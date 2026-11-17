import { describe, expect, it } from "vitest";
import { distance, formatDistance, pointName } from "./geometria-model";

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
});
