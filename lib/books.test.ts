import { describe, expect, it } from "vitest";
import { BOOKS, BOOK_LEVELS, bookById, booksByLevel } from "./books";

describe("catálogo de libros", () => {
  it("tiene ids únicos y fichas completas con licencia verificada", () => {
    const ids = BOOKS.map((book) => book.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const book of BOOKS) {
      expect(book.title.trim().length).toBeGreaterThan(0);
      expect(book.license).toContain("CC BY-NC-SA");
      expect(book.attribution.trim().length).toBeGreaterThan(0);
      expect(book.source.name.trim().length).toBeGreaterThan(0);
      expect(book.source.url).toMatch(/^https:\/\/apuntesmareaverde\.org\.es\//);
      expect(book.format).toBe("pdf");
      expect(book.sizeBytes).toBeGreaterThan(0);
      // Ingeridos: clave versionada en R2 y versión registrada.
      expect(book.storageKey).toBe(`books/${book.id}/${book.version}.pdf`);
      expect(book.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("cubre ESO y Bachillerato con todos sus cursos", () => {
    expect(new Set(BOOKS.map((book) => book.level))).toEqual(new Set(BOOK_LEVELS));
    const esoCourses = booksByLevel("ESO").map((book) => book.course);
    expect(esoCourses).toEqual(["1º", "2º", "3º", "4ºA", "4ºB"]);
    const bachCourses = booksByLevel("Bachillerato").map((book) => book.course);
    expect(new Set(bachCourses)).toEqual(new Set(["1º", "2º"]));
    expect(booksByLevel("Bachillerato")).toHaveLength(5);
  });

  it("busca por id y devuelve undefined si no existe", () => {
    expect(bookById("eso-matematicas-1")?.title).toBe("Matemáticas 1º ESO");
    expect(bookById("inexistente")).toBeUndefined();
  });
});
