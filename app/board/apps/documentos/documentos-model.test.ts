import { describe, expect, it } from "vitest";
import {
  NOTE_TITLE_MAX_LENGTH,
  STARTER_DOCUMENT,
  countWords,
  createStarterDocument,
  normalizeLinkUrl,
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
});
