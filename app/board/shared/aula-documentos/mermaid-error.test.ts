import { describe, expect, it } from "vitest";
import { formatMermaidError } from "./mermaid-error";

describe("errores Mermaid de Aula Documentos", () => {
  it("extrae la línea y conserva el detalle completo", () => {
    const error = formatMermaidError(new Error("Parse error on line 3:\nA -->\nExpecting NODE_STRING"));
    expect(error.line).toBe(3);
    expect(error.summary).toBe("No se pudo dibujar el diagrama (línea 3).");
    expect(error.detail).toContain("Expecting NODE_STRING");
  });

  it("mantiene errores sin línea", () => {
    const error = formatMermaidError("Syntax error in text");
    expect(error.line).toBeNull();
    expect(error.summary).toBe("No se pudo dibujar el diagrama.");
    expect(error.detail).toBe("Syntax error in text");
  });

  it("usa un fallback si el error no trae mensaje", () => {
    expect(formatMermaidError(null)).toEqual({
      summary: "No se pudo dibujar el diagrama.",
      detail: "No se pudo dibujar el diagrama.",
      line: null,
    });
  });
});
