import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { buildPresentationSlides } from "../../../../lib/domain/aula-documentos/presentation";
import { SlideBreak } from "./slide-break";
import {
  notesForAulaSlides,
  readAulaSlideDrafts,
  replaceAulaSlideDrafts,
} from "./slide-structure";

const editors: Editor[] = [];

/**
 * Crea un editor con dos diapositivas implícitas.
 * @returns El editor.
 */
function makeEditor() {
  const editor = new Editor({
    extensions: [StarterKit, SlideBreak],
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "Contenido A" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "B" }] },
        { type: "paragraph", content: [{ type: "text", text: "Contenido B" }] },
      ],
    },
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("estructura editable de diapositivas", () => {
  it("materializa saltos y mueve notas con el orden", () => {
    const editor = makeEditor();
    const drafts = readAulaSlideDrafts(editor, { "0": "Nota A", "1": "Nota B" });
    expect(drafts.map((slide) => slide.notes)).toEqual(["Nota A", "Nota B"]);

    const [first] = drafts.splice(0, 1);
    drafts.push(first);
    expect(replaceAulaSlideDrafts(editor, drafts, 1)).toBe(true);

    expect(buildPresentationSlides(editor.getJSON()).map((slide) => slide.title)).toEqual(["B", "A"]);
    expect(editor.getJSON().content?.some((node) => node.type === "slideBreak")).toBe(true);
    expect(notesForAulaSlides(drafts)).toEqual({ "0": "Nota B", "1": "Nota A" });
  });

  it("duplica contenido y nota en la posición siguiente", () => {
    const editor = makeEditor();
    const drafts = readAulaSlideDrafts(editor, { "0": "Nota A" });
    drafts.splice(1, 0, {
      content: structuredClone(drafts[0].content),
      notes: drafts[0].notes,
    });

    expect(replaceAulaSlideDrafts(editor, drafts, 1)).toBe(true);
    expect(buildPresentationSlides(editor.getJSON()).map((slide) => slide.title)).toEqual(["A", "A", "B"]);
    expect(notesForAulaSlides(drafts)).toEqual({ "0": "Nota A", "1": "Nota A" });
  });

  it("elimina una diapositiva y deja las notas consecutivas", () => {
    const editor = makeEditor();
    const drafts = readAulaSlideDrafts(editor, { "0": "Nota A", "1": "Nota B" });
    drafts.splice(0, 1);

    expect(replaceAulaSlideDrafts(editor, drafts, 0)).toBe(true);
    expect(buildPresentationSlides(editor.getJSON()).map((slide) => slide.title)).toEqual(["B"]);
    expect(notesForAulaSlides(drafts)).toEqual({ "0": "Nota B" });
  });

  it("mantiene sesenta diapositivas al mover la última al principio", () => {
    const editor = new Editor({
      extensions: [StarterKit, SlideBreak],
      content: {
        type: "doc",
        content: Array.from({ length: 60 }, (_, index) => ({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: `Diapositiva ${index + 1}` }],
        })),
      },
    });
    editors.push(editor);

    const drafts = readAulaSlideDrafts(editor, { "0": "Nota inicial" });
    const [last] = drafts.splice(-1, 1);
    drafts.unshift(last);
    expect(replaceAulaSlideDrafts(editor, drafts, 0)).toBe(true);
    const slides = buildPresentationSlides(editor.getJSON());
    expect(slides).toHaveLength(60);
    expect(slides[0].title).toBe("Diapositiva 60");
    expect(notesForAulaSlides(drafts)).toEqual({ "1": "Nota inicial" });
  });

  it("mantiene una diapositiva vacía válida al quitar el contenido", () => {
    const editor = makeEditor();
    expect(replaceAulaSlideDrafts(editor, [{ content: [], notes: "" }], 0)).toBe(true);
    expect(buildPresentationSlides(editor.getJSON())).toHaveLength(1);
    expect(editor.getText()).toBe("");
  });
});
