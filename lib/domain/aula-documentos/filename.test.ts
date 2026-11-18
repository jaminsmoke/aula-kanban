import { describe, expect, it } from "vitest";
import { aulaFileName, aulaFileSlug, aulaRecoveryFileName } from "./filename";

describe("nombres de archivo de Aula Documentos", () => {
  it("convierte títulos con acentos y signos en slugs legibles", () => {
    expect(aulaFileSlug("  Introducción: Aula 2026 ")).toBe("introduccion-aula-2026");
    expect(aulaFileName("Árbol de Navidad", "md")).toBe("arbol-de-navidad.md");
    expect(aulaFileName("Proyecto final", ".html")).toBe("proyecto-final.html");
  });

  it("usa el fallback cuando el título no deja caracteres útiles", () => {
    expect(aulaFileSlug("!!!", "documento")).toBe("documento");
    expect(aulaFileName("", "html")).toBe("documento.html");
  });

  it("limita el slug y evita guiones finales", () => {
    const slug = aulaFileSlug(`${"a".repeat(80)}---`);
    expect(slug.length).toBeLessThanOrEqual(72);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("genera el nombre del JSON de recuperación", () => {
    expect(aulaRecoveryFileName("Documento roto")).toBe("documento-roto-recuperacion.json");
    expect(aulaRecoveryFileName()).toBe("documento-recuperacion.json");
  });
});
