import { describe, expect, it } from "vitest";
import { findPeriodicElement, PERIODIC_ELEMENTS } from "./periodic";

describe("catálogo periódico compartido", () => {
  it("conserva los 118 elementos", () => {
    expect(PERIODIC_ELEMENTS).toHaveLength(118);
  });

  it("busca por símbolo sin distinguir mayúsculas", () => {
    expect(findPeriodicElement({ simbolo: "na" })).toMatchObject({ number: 11, symbol: "Na", name: "Sodio" });
  });

  it("busca por número atómico", () => {
    expect(findPeriodicElement({ numero: 26 })).toMatchObject({ number: 26, symbol: "Fe", name: "Hierro" });
  });

  it("devuelve null si no existe", () => {
    expect(findPeriodicElement({ simbolo: "Xx" })).toBeNull();
    expect(findPeriodicElement({ numero: 119 })).toBeNull();
  });
});
