import { describe, expect, it } from "vitest";
import { parseAulaDocument } from "./document";
import { buildPresentationSlides } from "./presentation";
import { AULA_DOCUMENT_TEMPLATES, findAulaDocumentTemplate } from "./templates";

/**
 * Valida una plantilla y devuelve su documento normalizado.
 * @param template - Plantilla a validar.
 * @returns El documento validado.
 */
function validDocument(template: (typeof AULA_DOCUMENT_TEMPLATES)[number]) {
  const result = parseAulaDocument(template.create());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("plantillas de Aula Documentos", () => {
  it("exporta plantillas únicas y localizables por id", () => {
    expect(AULA_DOCUMENT_TEMPLATES.map((template) => template.id)).toEqual([
      "empty",
      "starter",
      "notes",
      "class-project",
      "presentation",
      "guide",
    ]);
    expect(new Set(AULA_DOCUMENT_TEMPLATES.map((template) => template.name)).size).toBe(AULA_DOCUMENT_TEMPLATES.length);
    expect(findAulaDocumentTemplate("notes")?.name).toBe("Apuntes de clase");
    expect(findAulaDocumentTemplate("missing" as never)).toBeUndefined();
  });

  it("genera documentos válidos con título y contenido", () => {
    for (const template of AULA_DOCUMENT_TEMPLATES) {
      const result = validDocument(template);
      expect(result.document.title.trim()).not.toBe("");
      expect(result.document.content.type).toBe("doc");
      expect(result.document.content.content?.length).toBeGreaterThan(0);
    }
  });

  it("crea una copia nueva en cada llamada", () => {
    for (const template of AULA_DOCUMENT_TEMPLATES) {
      const first = template.create();
      const second = template.create();
      expect(first).not.toBe(second);
      expect(first.content).not.toBe(second.content);
      first.content.content?.pop();
      expect(second.content.content?.length).toBeGreaterThan(0);
    }
  });

  it("mantiene vacío el documento en blanco", () => {
    const result = parseAulaDocument(AULA_DOCUMENT_TEMPLATES[0].create());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Documento sin título");
    expect(result.document.content.content).toEqual([{ type: "paragraph", content: [] }]);
  });

  it("incluye lista en los apuntes y diagrama en el proyecto", () => {
    const notes = validDocument(findAulaDocumentTemplate("notes")!);
    expect(notes.stats.mermaidBlocks).toBe(0);
    expect(JSON.stringify(notes.document.content)).toContain("bulletList");

    const project = validDocument(findAulaDocumentTemplate("class-project")!);
    expect(project.stats.mermaidBlocks).toBe(1);
    expect(JSON.stringify(project.document.content)).toContain("flowchart TD");
  });

  it("genera tres diapositivas en la plantilla de presentación", () => {
    const result = validDocument(findAulaDocumentTemplate("presentation")!);
    expect(result.stats.slideBreaks).toBe(2);
    const slides = buildPresentationSlides(result.document.content);
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe("Idea central");
    expect(slides[2].title).toBe("Cierre");
  });

  it("incluye pasos y consejo en la guía", () => {
    const result = validDocument(findAulaDocumentTemplate("guide")!);
    const serialized = JSON.stringify(result.document.content);
    expect(serialized).toContain("orderedList");
    expect(serialized).toContain("blockquote");
  });
});
