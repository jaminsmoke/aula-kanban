import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { replaceAulaSearchMatches, searchAulaDocument } from "./search";

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

describe("búsqueda de Aula Documentos", () => {
  it("encuentra texto visible sin distinguir mayúsculas ni acentos", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Física y fisica; práctica." }],
      }],
    });

    const insensitive = searchAulaDocument(editor, { query: "fisica", caseSensitive: false, diacriticsSensitive: false });
    expect(insensitive).toHaveLength(2);
    expect(insensitive.map((match) => match.text)).toEqual(["Física", "fisica"]);

    const caseSensitive = searchAulaDocument(editor, { query: "fisica", caseSensitive: true, diacriticsSensitive: false });
    expect(caseSensitive).toHaveLength(1);

    const accentSensitive = searchAulaDocument(editor, { query: "fisica", caseSensitive: false, diacriticsSensitive: true });
    expect(accentSensitive).toHaveLength(1);
  });

  it("reemplaza sin perder las marcas del texto", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "Hola" },
          { type: "text", text: " mundo" },
        ],
      }],
    });
    const matches = searchAulaDocument(editor, { query: "Hola", caseSensitive: true, diacriticsSensitive: true });

    expect(replaceAulaSearchMatches(editor, matches, "Adiós")).toBe(true);
    const first = (editor.getJSON().content?.[0]?.content ?? [])[0];
    expect(first).toMatchObject({ type: "text", text: "Adiós", marks: [{ type: "bold" }] });
    expect(editor.getText()).toContain("Adiós mundo");
  });
});
