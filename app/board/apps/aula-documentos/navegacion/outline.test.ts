import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { buildPresentationSlides } from "../../../../../lib/domain/aula-documentos/presentation";
import {
  activeAulaOutlineIndex,
  buildAulaOutline,
  buildAulaSlideIndex,
  flattenAulaOutline,
} from "./outline";
import { SlideBreak } from "../editor/slide-break";

const editors: Editor[] = [];

/**
 * Crea un editor con los nodos necesarios para las pruebas.
 * @param content - Contenido Tiptap.
 * @returns El editor.
 */
function makeEditor(content: Record<string, unknown>) {
  const editor = new Editor({ extensions: [StarterKit, SlideBreak], content });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("esquema de Aula Documentos", () => {
  it("anida H1–H3, omite títulos vacíos y conserva repetidos", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Unidad" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Tema profundo" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tema" }] },
        { type: "heading", attrs: { level: 1 } },
        { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "No aparece" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Unidad" }] },
      ],
    });

    const outline = buildAulaOutline(editor);
    expect(outline).toHaveLength(2);
    expect(outline[0].text).toBe("Unidad");
    expect(outline[0].children.map((entry) => entry.text)).toEqual(["Tema profundo", "Tema"]);
    expect(outline[1].text).toBe("Unidad");

    const rows = flattenAulaOutline(outline);
    expect(rows.map((row) => [row.text, row.depth])).toEqual([
      ["Unidad", 0],
      ["Tema profundo", 1],
      ["Tema", 1],
      ["Unidad", 0],
    ]);
    expect(activeAulaOutlineIndex(rows, rows[2].from + 1)).toBe(2);
    expect(activeAulaOutlineIndex(rows, 0)).toBe(0);
  });
});

describe("navegador de diapositivas de Aula Documentos", () => {
  it("coincide con buildPresentationSlides sin saltos explícitos", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Uno" }] },
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dos" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Tres" }] },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Cuatro" }] },
      ],
    });

    const slides = buildAulaSlideIndex(editor);
    expect(slides.map((slide) => slide.title)).toEqual(["Uno", "Dos", "Cuatro"]);
    expect(slides.map((slide) => slide.title)).toEqual(
      buildPresentationSlides(editor.getJSON()).map((slide) => slide.title),
    );
    expect(slides[0].from).toBe(0);
    expect(slides[1].from).toBeGreaterThan(slides[0].from);
    expect(slides[2].from).toBeGreaterThan(slides[1].from);
    for (const slide of slides) expect(slide.to).toBeGreaterThan(slide.from);
  });

  it("respeta slideBreak y no crea diapositivas vacías", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Uno" }] },
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "slideBreak" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Dos" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
        { type: "slideBreak" },
        { type: "slideBreak" },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
      ],
    });

    const slides = buildAulaSlideIndex(editor);
    expect(slides.map((slide) => slide.title)).toEqual(["Uno", "Dos", "C"]);
    expect(slides.map((slide) => slide.title)).toEqual(
      buildPresentationSlides(editor.getJSON()).map((slide) => slide.title),
    );
    expect(slides[0].from).toBe(0);
    expect(slides[1].from).toBeGreaterThan(slides[0].to);
    expect(slides[2].from).toBeGreaterThan(slides[1].to);
  });

  it("deja una diapositiva de respaldo cuando no hay contenido", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Sin títulos" }] }],
    });

    expect(buildAulaOutline(editor)).toEqual([]);
    expect(buildAulaSlideIndex(editor)).toEqual([
      expect.objectContaining({ index: 0, title: "Sin títulos", from: 0 }),
    ]);
  });

  it("mantiene el orden de muchas diapositivas", () => {
    const editor = makeEditor({
      type: "doc",
      content: Array.from({ length: 60 }, (_, index) => ({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: `Diapositiva ${index + 1}` }],
      })),
    });

    const slides = buildAulaSlideIndex(editor);
    expect(slides).toHaveLength(60);
    expect(slides.at(-1)).toMatchObject({ index: 59, title: "Diapositiva 60" });
    expect(slides.every((slide, index) => slide.index === index)).toBe(true);
  });
});
