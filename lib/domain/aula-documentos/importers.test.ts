import { describe, expect, it } from "vitest";
import {
  importLegacyDocument,
  importMermaidDocument,
  importNotesDocument,
  importPresentationDocument,
} from "./importers";
import { AULA_DOCUMENT_MARKDOWN_MAX_LENGTH } from "./markdown";

describe("importadores de Aula Documentos", () => {
  it("convierte Notas y documentos sin modificar el original", () => {
    const source = {
      title: "Notas de clase",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Plan" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Una " },
              {
                type: "text",
                text: "fuente",
                marks: [{ type: "link", attrs: { href: "https://example.com" } }],
              },
            ],
          },
        ],
      },
    };
    const original = structuredClone(source);

    const result = importNotesDocument(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("documentos");
    expect(result.preview.document.title).toBe("Notas de clase");
    expect(result.preview.stats.nodes).toBe(6);
    expect(result.preview.document.content.content?.[1]?.content?.[1].marks?.[0].attrs).toMatchObject({
      href: "https://example.com/",
      target: "_blank",
    });
    expect(source).toEqual(original);
  });

  it("quita el H1 que repite el título al importar Notas y lo avisa", () => {
    const source = {
      title: "Introducción de clase",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "  introduccion DE CLASE " }] },
          { type: "paragraph", content: [{ type: "text", text: "Contenido." }] },
        ],
      },
    };
    const original = structuredClone(source);
    const result = importNotesDocument(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.document.content.content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "Contenido." }] },
    ]);
    expect(result.preview.warnings).toContain("Se quitó el H1 inicial porque repetía el título.");
    expect(source).toEqual(original);
  });

  it("conserva un H1 distinto al importar Notas", () => {
    const result = importNotesDocument({
      title: "Documento",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Otro título" }] },
          { type: "paragraph" },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.document.content.content?.[0]).toMatchObject({ type: "heading" });
    expect(result.preview.warnings).toHaveLength(0);
  });

  it("convierte un diagrama en un documento de un solo bloque", () => {
    const result = importMermaidDocument({ code: "flowchart TD\nA --> B" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("mermaid");
    expect(result.preview.stats.mermaidBlocks).toBe(1);
    expect(result.preview.document.content.content?.[0]).toMatchObject({
      type: "mermaidBlock",
      attrs: { code: "flowchart TD\nA --> B" },
    });
    expect(result.preview.warnings).toHaveLength(1);
  });

  it("convierte Presentaciones en diapositivas con texto, listas y código", () => {
    const source = {
      markdown: `# Presentación

Una idea **fuerte**.

---

## Ideas

- Primera
- Segunda

\`\`\`js
const x = 1;
\`\`\`
`,
    };
    const original = structuredClone(source);

    const result = importPresentationDocument(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.source).toBe("presentaciones");
    expect(result.preview.document.title).toBe("Presentación");
    expect(result.preview.stats.slideBreaks).toBe(1);
    expect(result.preview.document.content.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "slideBreak" }),
      expect.objectContaining({ type: "bulletList" }),
      expect.objectContaining({ type: "codeBlock" }),
    ]));
    expect(source).toEqual(original);
  });

  it("rechaza estados antiguos inválidos y documentos demasiado grandes", () => {
    expect(importNotesDocument(null)).toMatchObject({ ok: false });
    expect(importNotesDocument({ title: 3, content: {} })).toMatchObject({ ok: false });
    expect(importNotesDocument({
      title: "T",
      content: { type: "doc", content: [{ type: "image", attrs: { src: "x" } }] },
    })).toMatchObject({ ok: false });
    expect(importMermaidDocument({ code: "x".repeat(20_001) })).toMatchObject({ ok: false });
    expect(importMermaidDocument({ code: "   " })).toMatchObject({ ok: false });
    expect(importPresentationDocument({
      markdown: "x".repeat(AULA_DOCUMENT_MARKDOWN_MAX_LENGTH + 1),
    })).toEqual({
      ok: false,
      message: "La presentación supera el tamaño permitido.",
    });
  });

  it("acepta el límite exacto de Markdown antiguo", () => {
    const result = importPresentationDocument({
      markdown: "x".padEnd(AULA_DOCUMENT_MARKDOWN_MAX_LENGTH, " "),
    });
    expect(result.ok).toBe(true);
  });

  it("dispatchea el importador por app de origen", () => {
    expect(importLegacyDocument("documentos", { title: "T", content: { type: "doc", content: [] } }).ok).toBe(true);
    expect(importLegacyDocument("mermaid", { code: "flowchart TD\nA --> B" }).ok).toBe(true);
    expect(importLegacyDocument("presentaciones", { markdown: "# Hola" }).ok).toBe(true);
  });
});
