import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearch } from "./search";

describe("búsqueda sin tildes", () => {
  it("normaliza mayúsculas, espacios exteriores y diacríticos", () => {
    expect(normalizeSearch("  Geometría  ")).toBe("geometria");
    expect(normalizeSearch("INVESTIGACIÓN")).toBe("investigacion");
  });

  it("encuentra el mismo campo con y sin tilde", () => {
    expect(matchesSearch("geometria", "Geometría")).toBe(true);
    expect(matchesSearch("GEOMETRÍA", "Geometría")).toBe(true);
    expect(matchesSearch("investigacion", "Investigación de placas")).toBe(true);
    expect(matchesSearch("investigación", "Investigacion de placas")).toBe(true);
  });

  it("busca entre varios campos y trata la consulta vacía como coincidencia", () => {
    expect(matchesSearch("ada", "Investigar placas", "Ada Lovelace")).toBe(true);
    expect(matchesSearch("", "cualquier tarea")).toBe(true);
    expect(matchesSearch("óptica", "Optica")).toBe(true);
  });
});
