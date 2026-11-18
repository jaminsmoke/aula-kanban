import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  AULA_DOCUMENT_JSON_MAX_LENGTH,
  AULA_DOCUMENT_MAX_DEPTH,
  AULA_DOCUMENT_MAX_MERMAID_BLOCKS,
  AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH,
  AULA_DOCUMENT_MAX_TEXT_LENGTH,
  AULA_DOCUMENT_SCHEMA_VERSION,
  createEmptyAulaDocument,
  normalizeAulaLink,
  parseAulaDocument,
} from "./document";

/**
 * Construye un documento candidato.
 * @param content - Hijos del nodo raíz.
 * @param title - Título.
 * @returns Documento sin validar.
 */
function candidate(content: JSONContent[], title = "Documento de prueba"): Record<string, unknown> {
  return {
    schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
    title,
    content: { type: "doc", content },
  };
}

/**
 * Texto enriquecido simple.
 * @param value - Texto.
 * @param marks - Marcas opcionales.
 * @returns Nodo de texto.
 */
function textNode(value: string, marks?: JSONContent["marks"]): JSONContent {
  return { type: "text", text: value, ...(marks ? { marks } : {}) };
}

describe("modelo de Aula Documentos", () => {
  it("valida texto, enlaces, Mermaid y saltos de diapositiva", () => {
    const result = parseAulaDocument(candidate([
      { type: "heading", attrs: { level: 2 }, content: [textNode("Plan")] },
      {
        type: "paragraph",
        content: [
          textNode("Una "),
          textNode("fuente", [{
            type: "link",
            attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer nofollow" },
          }]),
          textNode(" fiable."),
        ],
      },
      { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
      { type: "slideBreak" },
    ]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Documento de prueba");
    expect(result.stats.mermaidBlocks).toBe(1);
    expect(result.stats.slideBreaks).toBe(1);
    expect(result.stats.textLength).toBe("PlanUna fuente fiable.".length);
  });

  it("normaliza enlaces y descarta protocolos peligrosos", () => {
    expect(normalizeAulaLink("example.com")).toBe("https://example.com/");
    expect(normalizeAulaLink("javascript:alert(1)")).toBeNull();
    expect(normalizeAulaLink("mailto:clase@example.com")).toBe("mailto:clase@example.com");

    const result = parseAulaDocument(candidate([{
      type: "paragraph",
      content: [textNode("Enlace", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])],
    }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const paragraph = result.document.content.content?.[0];
    expect(paragraph?.content?.[0].marks).toBeUndefined();
  });

  it("rechaza versiones futuras y esquemas desconocidos", () => {
    const future = parseAulaDocument({ ...candidate([]), schemaVersion: 3 });
    expect(future).toMatchObject({ ok: false, code: "unsupported-version" });

    const unknown = parseAulaDocument({ ...candidate([]), schemaVersion: 0 });
    expect(unknown).toMatchObject({ ok: false, code: "invalid-schema" });
  });

  it("migra documentos v1 y normaliza el tema de presentación", () => {
    const v1 = parseAulaDocument({ ...candidate([{ type: "paragraph" }]), schemaVersion: 1 });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.document.schemaVersion).toBe(2);
    expect(v1.document.presentation).toEqual({ theme: "aula" });

    const custom = parseAulaDocument({
      ...candidate([{ type: "paragraph" }]),
      presentation: { theme: "claro" },
    });
    expect(custom.ok).toBe(true);
    if (!custom.ok) return;
    expect(custom.document.presentation).toEqual({ theme: "claro" });

    const invalid = parseAulaDocument({
      ...candidate([{ type: "paragraph" }]),
      presentation: { theme: "inventado" },
    });
    expect(invalid.ok).toBe(true);
    if (!invalid.ok) return;
    expect(invalid.document.presentation).toEqual({ theme: "aula" });
  });

  it("rechaza nodos y marcas no compatibles", () => {
    const unknownNode = parseAulaDocument(candidate([{ type: "image", attrs: { src: "x" } }]));
    expect(unknownNode).toMatchObject({ ok: false, code: "invalid-content" });

    const invalidText = { type: "text", text: "Hola", marks: "bold" } as unknown as JSONContent;
    const invalidMarks = parseAulaDocument(candidate([{
      type: "paragraph",
      content: [invalidText],
    }]));
    expect(invalidMarks).toMatchObject({ ok: false, code: "invalid-content" });
  });

  it("aplica los límites de profundidad, hijos, nodos, texto y JSON", () => {
    let deep: JSONContent = { type: "paragraph" };
    for (let index = 0; index <= AULA_DOCUMENT_MAX_DEPTH; index += 1) {
      deep = { type: "blockquote", content: [deep] };
    }
    expect(parseAulaDocument(candidate([deep]))).toMatchObject({ ok: false, code: "too-deep" });

    expect(parseAulaDocument(candidate(Array.from({ length: 1_001 }, () => ({ type: "paragraph" })))))
      .toMatchObject({ ok: false, code: "too-many-children" });

    const manyNodes = Array.from({ length: 4 }, () => ({
      type: "blockquote" as const,
      content: Array.from({ length: 999 }, () => ({ type: "paragraph" as const })),
    }));
    expect(parseAulaDocument(candidate(manyNodes))).toMatchObject({ ok: false, code: "too-many-nodes" });

    expect(parseAulaDocument(candidate([{
      type: "paragraph",
      content: [textNode("x".repeat(AULA_DOCUMENT_MAX_TEXT_LENGTH + 1))],
    }]))).toMatchObject({ ok: false, code: "too-much-text" });

    const huge = Array.from({ length: 2_000 }, () => ({
      type: "paragraph" as const,
      content: [textNode("x".repeat(100))],
    }));
    expect(JSON.stringify(candidate(huge)).length).toBeGreaterThan(AULA_DOCUMENT_JSON_MAX_LENGTH);
    expect(parseAulaDocument(candidate(huge))).toMatchObject({ ok: false, code: "too-large" });
  });

  it("limita la cantidad y el tamaño de los diagramas Mermaid", () => {
    const tooMany = Array.from({ length: AULA_DOCUMENT_MAX_MERMAID_BLOCKS + 1 }, () => ({
      type: "mermaidBlock" as const,
      attrs: { code: "flowchart TD\nA --> B" },
    }));
    expect(parseAulaDocument(candidate(tooMany))).toMatchObject({ ok: false, code: "too-many-mermaid" });

    expect(parseAulaDocument(candidate([{
      type: "mermaidBlock",
      attrs: { code: "x".repeat(AULA_DOCUMENT_MAX_MERMAID_CODE_LENGTH + 1) },
    }]))).toMatchObject({ ok: false, code: "mermaid-too-long" });

    expect(parseAulaDocument(candidate(Array.from({ length: 5 }, () => ({
      type: "mermaidBlock" as const,
      attrs: { code: "x".repeat(17_000) },
    }))))).toMatchObject({ ok: false, code: "mermaid-too-large" });

    expect(parseAulaDocument(candidate([{
      type: "mermaidBlock",
      attrs: { code: "" },
    }]))).toMatchObject({ ok: true });
  });

  it("crea un documento vacío válido", () => {
    const empty = createEmptyAulaDocument();
    const result = parseAulaDocument(empty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Documento sin título");
    expect(result.stats.nodes).toBe(2);
  });
});
