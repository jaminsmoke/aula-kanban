import { describe, expect, it } from "vitest";
import { buildPresentationSlides, hasExplicitSlideBreaks } from "./presentation";
import type { JSONContent } from "@tiptap/core";

/**
 * Crea un nodo de texto.
 * @param text - Texto.
 * @returns Nodo Tiptap.
 */
function text(text: string): JSONContent {
  return { type: "text", text };
}

describe("presentación de Aula Documentos", () => {
  it("divide por H1/H2 cuando no hay saltos explícitos", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("Inicio")] },
        { type: "paragraph", content: [text("Bienvenida")] },
        { type: "heading", attrs: { level: 2 }, content: [text("Ideas")] },
        { type: "bulletList", content: [] },
      ],
    };
    const slides = buildPresentationSlides(content);
    expect(slides).toHaveLength(2);
    expect(slides[0].title).toBe("Inicio");
    expect(slides[1].title).toBe("Ideas");
    expect(hasExplicitSlideBreaks(content)).toBe(false);
  });

  it("respeta los saltos explícitos y conserva diagramas y listas", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [text("Portada")] },
        { type: "slideBreak" },
        { type: "heading", attrs: { level: 2 }, content: [text("Diagrama")] },
        { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
        { type: "slideBreak" },
        { type: "bulletList", content: [] },
      ],
    };
    const slides = buildPresentationSlides(content);
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe("Portada");
    expect(slides[1].title).toBe("Diagrama");
    expect(slides[1].content.some((node) => node.type === "mermaidBlock")).toBe(true);
    expect(slides[2].title).toBe("Diapositiva 3");
    expect(hasExplicitSlideBreaks(content)).toBe(true);
  });

  it("genera una única diapositiva para un documento sin títulos", () => {
    const slides = buildPresentationSlides({
      type: "doc",
      content: [{ type: "paragraph", content: [text("Texto único")] }],
    });
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe("Texto único");
  });

  it("no modifica el contenido original", () => {
    const original: JSONContent = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 }, content: [text("Título")] }],
    };
    const before = structuredClone(original);
    buildPresentationSlides(original);
    expect(original).toEqual(before);
  });
});
