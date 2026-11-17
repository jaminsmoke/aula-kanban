import { describe, expect, it } from "vitest";
import {
  NOTE_TITLE_MAX_LENGTH,
  STARTER_DOCUMENT,
  countWords,
  createStarterDocument,
  normalizeLinkUrl,
  parseNotesDocument,
} from "./documentos-model";

describe("modelo de Notas y documentos", () => {
  it("crea una copia independiente del documento de ejemplo", () => {
    const first = createStarterDocument();
    const second = createStarterDocument();

    expect(first.title).toBe(STARTER_DOCUMENT.title);
    expect(first.content.type).toBe("doc");
    expect(first.content).not.toBe(second.content);
    expect(first.content).not.toBe(STARTER_DOCUMENT.content);
    expect(NOTE_TITLE_MAX_LENGTH).toBeGreaterThan(40);
  });

  it("normaliza enlaces seguros y rechaza protocolos peligrosos", () => {
    expect(normalizeLinkUrl("example.com")).toBe("https://example.com/");
    expect(normalizeLinkUrl("https://example.com/ruta")).toBe("https://example.com/ruta");
    expect(normalizeLinkUrl("nombre@example.com")).toBe("mailto:nombre@example.com");
    expect(normalizeLinkUrl("mailto:nombre@example.com")).toBe("mailto:nombre@example.com");
    expect(normalizeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeLinkUrl("data:text/html,hola")).toBeNull();
    expect(normalizeLinkUrl("   ")).toBeNull();
  });

  it("cuenta palabras separadas por espacios", () => {
    expect(countWords("  una nota   breve ")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords("una\nnota\nde ejemplo")).toBe(4);
  });

  it("valida el documento guardado y normaliza los enlaces", () => {
    const parsed = parseNotesDocument({
      title: "  Nota segura  ",
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{
            type: "text",
            text: "Enlace",
            marks: [{ type: "link", attrs: { href: "example.com" } }],
          }],
        }],
      },
    });

    expect(parsed?.title).toBe("Nota segura");
    expect(parsed?.content.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.href).toBe("https://example.com/");

    const unsafe = parseNotesDocument({
      title: "Nota",
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{
            type: "text",
            text: "Sin enlace",
            marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          }],
        }],
      },
    });
    expect(unsafe?.content.content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("rechaza documentos con estructura, título o profundidad no válidos", () => {
    expect(parseNotesDocument({ title: "x", content: { type: "doc" } })).not.toBeNull();
    expect(parseNotesDocument({ title: "x".repeat(NOTE_TITLE_MAX_LENGTH + 1), content: { type: "doc" } })).toBeNull();
    expect(parseNotesDocument({ title: "x", content: { type: "image" } })).toBeNull();
    expect(parseNotesDocument({ title: "x", content: { type: "heading", attrs: { level: 7 } } })).toBeNull();
    expect(parseNotesDocument({ title: "x", content: { type: "text", text: "suelto" } })).toBeNull();

    let deep: Record<string, unknown> = { type: "paragraph", content: [{ type: "text", text: "fin" }] };
    for (let index = 0; index < 26; index += 1) {
      deep = { type: "blockquote", content: [deep] };
    }
    expect(parseNotesDocument({ title: "x", content: { type: "doc", content: [deep] } })).toBeNull();
  });
});
