import { describe, expect, it } from "vitest";
import { ProjectBooksError, parseProjectBooks } from "./project-books";

describe("parseProjectBooks", () => {
  it("valida ids del catálogo y elimina duplicados", () => {
    expect(parseProjectBooks({ bookIds: ["eso-matematicas-1", "eso-matematicas-1", "bach-generales"] }))
      .toEqual(["eso-matematicas-1", "bach-generales"]);
    expect(parseProjectBooks({ bookIds: [] })).toEqual([]);
  });

  it("rechaza cuerpos sin lista o con libros desconocidos", () => {
    for (const body of [null, {}, { bookIds: "eso-matematicas-1" }, { bookIds: ["inexistente"] }, { bookIds: [42] }]) {
      expect(() => parseProjectBooks(body)).toThrow(ProjectBooksError);
      try {
        parseProjectBooks(body);
      } catch (error) {
        expect((error as ProjectBooksError).status).toBe(400);
      }
    }
  });
});
