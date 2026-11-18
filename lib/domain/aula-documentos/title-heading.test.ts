import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  DUPLICATE_TITLE_WARNING,
  normalizeAulaTitle,
  stripDuplicateTitleHeading,
} from "./title-heading";

/**
 * Construye un documento con bloques.
 * @param content - Bloques del documento.
 * @returns Nodo raíz.
 */
function doc(content: JSONContent[]): JSONContent {
  return { type: "doc", content };
}

/**
 * Construye un H1.
 * @param value - Texto.
 * @returns Nodo de título.
 */
function h1(value: string): JSONContent {
  return { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: value }] };
}

describe("título inicial de Aula Documentos", () => {
  it("normaliza mayúsculas, acentos y espacios", () => {
    expect(normalizeAulaTitle("  Introducción   de clase ")).toBe("introduccion de clase");
    expect(normalizeAulaTitle("INTRODUCCION DE CLASE")).toBe("introduccion de clase");
  });

  it("retira solo el primer H1 equivalente al título", () => {
    const content = doc([
      h1("  Introducción de clase "),
      { type: "paragraph", content: [{ type: "text", text: "Texto." }] },
    ]);
    const before = structuredClone(content);

    const result = stripDuplicateTitleHeading(content, "introduccion DE CLASE");
    expect(result.removed).toBe(true);
    expect(result.warning).toBe(DUPLICATE_TITLE_WARNING);
    expect(result.content.content).toEqual([{ type: "paragraph", content: [{ type: "text", text: "Texto." }] }]);
    expect(content).toEqual(before);
  });

  it("conserva un H1 distinto, un H2 o un H1 que no está al inicio", () => {
    const different = doc([h1("Otro título"), { type: "paragraph" }]);
    expect(stripDuplicateTitleHeading(different, "Documento").removed).toBe(false);
    expect(stripDuplicateTitleHeading(different, "Documento").content).toBe(different);

    const h2 = doc([{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Documento" }] }]);
    expect(stripDuplicateTitleHeading(h2, "Documento").removed).toBe(false);

    const later = doc([
      { type: "paragraph", content: [{ type: "text", text: "Introducción" }] },
      h1("Documento"),
    ]);
    expect(stripDuplicateTitleHeading(later, "Documento").removed).toBe(false);
  });

  it("deja un párrafo vacío si el H1 era el único contenido", () => {
    const result = stripDuplicateTitleHeading(doc([h1("Documento")]), "Documento");
    expect(result.removed).toBe(true);
    expect(result.content.content).toEqual([{ type: "paragraph" }]);
  });

  it("no retira un H1 vacío ni un documento sin encabezado", () => {
    const empty = doc([{ type: "heading", attrs: { level: 1 } }]);
    expect(stripDuplicateTitleHeading(empty, "Documento").removed).toBe(false);

    const paragraph = doc([{ type: "paragraph", content: [{ type: "text", text: "Documento" }] }]);
    expect(stripDuplicateTitleHeading(paragraph, "Documento").removed).toBe(false);
  });
});
