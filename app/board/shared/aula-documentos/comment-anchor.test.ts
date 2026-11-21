import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { createAulaCommentAnchor, resolveAulaCommentAnchor } from "./comment-anchor";

const editors: Editor[] = [];

/**
 * Crea un editor de prueba.
 * @param content - Contenido Tiptap.
 * @returns El editor.
 */
function makeEditor(content: Record<string, unknown>) {
  const editor = new Editor({ extensions: [StarterKit], content });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("anclas de comentarios", () => {
  it("crea y resuelve una selección de texto", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hola mundo" }] }],
    });
    editor.commands.setTextSelection({ from: 1, to: 5 });
    const anchor = createAulaCommentAnchor(editor);

    expect(anchor).toMatchObject({ quote: "Hola", blockIndex: 0 });
    expect(resolveAulaCommentAnchor(editor, anchor!)).toEqual({ from: 1, to: 5, orphan: false });
  });

  it("ancla un bloque cuando la selección está colapsada", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Bloque completo" }] }],
    });
    editor.commands.setTextSelection(3);
    const anchor = createAulaCommentAnchor(editor);

    expect(anchor).toMatchObject({ quote: "Bloque completo", blockIndex: 0 });
    expect(resolveAulaCommentAnchor(editor, anchor!)).toEqual({ from: 0, to: 17, orphan: false });
  });

  it("marca como huérfana una cita que ya no existe", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Texto original" }] }],
    });
    editor.commands.setTextSelection({ from: 1, to: 6 });
    const anchor = createAulaCommentAnchor(editor)!;
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Otro contenido" }] }],
    });

    expect(resolveAulaCommentAnchor(editor, anchor)).toEqual({ from: null, to: null, orphan: true });
  });

  it("usa el contexto cuando la cita aparece varias veces", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Hola uno. Hola dos. Hola tres." }],
      }],
    });
    editor.commands.setTextSelection({ from: 1, to: 5 });
    const anchor = createAulaCommentAnchor(editor)!;
    expect(resolveAulaCommentAnchor(editor, { ...anchor, prefix: "Hola uno. ", suffix: " uno." })).toEqual({
      from: 1,
      to: 5,
      orphan: false,
    });
  });
});
