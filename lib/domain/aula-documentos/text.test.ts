import { describe, expect, it } from "vitest";
import { contentText, countWords } from "./text";

describe("texto de Aula Documentos", () => {
  it("cuenta palabras ignorando espacios repetidos", () => {
    expect(countWords("  Hola   mundo \n de clase ")).toBe(4);
    expect(countWords("   ")).toBe(0);
  });

  it("extrae el texto visible de un documento Tiptap", () => {
    expect(contentText({
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Título" }] },
        { type: "paragraph", content: [{ type: "text", text: "Cuerpo" }] },
      ],
    })).toBe("Título Cuerpo");
  });
});
