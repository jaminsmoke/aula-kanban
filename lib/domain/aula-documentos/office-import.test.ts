import { describe, expect, it } from "vitest";
import { AULA_DOCUMENT_MARKDOWN_MAX_LENGTH } from "./markdown";
import { officeMarkdownToPreview } from "./office-import";

describe("importación de Markdown desde Office", () => {
  it("convierte encabezados, listas, tablas y enlaces en un documento Aula", () => {
    const result = officeMarkdownToPreview({
      format: "docx",
      fileName: "informe.docx",
      markdown: [
        "# Informe",
        "",
        "Un párrafo con [un enlace](https://example.com).",
        "",
        "- Primer punto",
        "- Segundo punto",
        "",
        "| Columna A | Columna B |",
        "| --- | --- |",
        "| Dato 1 | Dato 2 |",
        "",
        "![Imagen](data:image/png;base64,abc)",
      ].join("\n"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("office");
    expect(result.preview.document.title).toBe("Informe");
    expect(result.preview.stats.textLength).toBeGreaterThan(20);
    expect(result.preview.document.content.content?.some((node) => node.type === "table")).toBe(true);
    expect(result.preview.warnings.some((warning) => warning.includes("imagen"))).toBe(true);
    expect(JSON.stringify(result.preview.document)).not.toContain("data:image");
  });

  it("quita el título duplicado cuando viene como párrafo", () => {
    const result = officeMarkdownToPreview({
      format: "docx",
      fileName: "informe.docx",
      markdown: "Informe de prueba\n\nTexto del informe.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.document.title).toBe("Informe de prueba");
    expect(result.preview.document.content.content?.[0]?.type).toBe("paragraph");
    expect(result.preview.document.content.content?.[0]?.content?.[0]?.text).toBe("Texto del informe.");
  });

  it("separa las diapositivas de un PPTX", () => {
    const result = officeMarkdownToPreview({
      format: "pptx",
      fileName: "presentacion.pptx",
      markdown: "# Primera\n\nContenido uno.\n\n---\n\n# Segunda\n\nContenido dos.",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.stats.slideBreaks).toBe(1);
    expect(result.preview.warnings.some((warning) => warning.includes("diapositivas"))).toBe(true);
  });

  it("usa un título útil y quita las notas del orador de PPTX", () => {
    const result = officeMarkdownToPreview({
      format: "pptx",
      fileName: "presentacion.pptx",
      markdown: [
        "# Slide 1",
        "",
        "Presentación de prueba",
        "",
        "Primer punto",
        "",
        "## Speaker notes",
        "",
        "1",
        "",
        "---",
        "",
        "# Slide 2",
        "",
        "Segunda diapositiva",
      ].join("\n"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.document.title).toBe("Presentación de prueba");
    expect(result.preview.warnings.some((warning) => warning.includes("notas del orador"))).toBe(true);
    expect(JSON.stringify(result.preview.document.content)).not.toContain("Speaker notes");
    expect(JSON.stringify(result.preview.document.content)).not.toContain("Slide 2");
  });

  it("rechaza archivos vacíos o demasiado grandes", () => {
    const empty = officeMarkdownToPreview({ format: "docx", fileName: "vacio.docx", markdown: "  " });
    expect(empty).toEqual({ ok: false, message: "El archivo de Office no contiene texto importable." });

    const large = officeMarkdownToPreview({
      format: "docx",
      fileName: "grande.docx",
      markdown: "x".repeat(AULA_DOCUMENT_MARKDOWN_MAX_LENGTH + 1),
    });
    expect(large.ok).toBe(false);
  });
});
