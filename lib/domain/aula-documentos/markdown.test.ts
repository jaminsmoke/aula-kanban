import { describe, expect, it } from "vitest";
import { AULA_DOCUMENT_SCHEMA_VERSION, parseAulaDocument, type AulaDocument } from "./document";
import { documentToMarkdown, documentToMarkdownExport, markdownToDocument } from "./markdown";

const source: AulaDocument = {
  schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
  title: "Mi documento",
  content: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Mi documento" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Texto " },
          { type: "text", text: "fuerte", marks: [{ type: "bold" }] },
          { type: "text", text: " y " },
          {
            type: "text",
            text: "enlace",
            marks: [{
              type: "link",
              attrs: { href: "https://example.com/", target: "_blank", rel: "noopener noreferrer nofollow" },
            }],
          },
          { type: "text", text: "." },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Primera idea" }],
            }],
          },
          {
            type: "listItem",
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: "Segunda idea" }],
            }],
          },
        ],
      },
      { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
    ],
  },
};

describe("Markdown de Aula Documentos", () => {
  it("importa y exporta tablas GFM", () => {
    const converted = markdownToDocument([
      "| Columna A | Columna B |",
      "| --- | --- |",
      "| Dato 1 | Dato 2 |",
    ].join("\n"), { titleFallback: "Tabla" });
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: converted.title,
      content: converted.content,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.content.content?.[0]?.type).toBe("table");
    expect(documentToMarkdown(parsed.document)).toContain("| Columna A | Columna B |");
    expect(documentToMarkdown(parsed.document)).toContain("| Dato 1 | Dato 2 |");
  });

  it("avisa de celdas combinadas y cabeceras no representables", () => {
    const merged: AulaDocument = {
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: "Tabla compleja",
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", attrs: { colspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Cabecera" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Dato" }] }] },
              ],
            },
          ],
        }],
      },
    };

    const result = documentToMarkdownExport(merged);
    expect(result.markdown).toContain("| Cabecera |");
    expect(result.warnings).toContain("Las celdas combinadas se exportan como celdas simples en Markdown.");
  });

  it("exporta título, formato, listas y Mermaid", () => {
    const markdown = documentToMarkdown(source);
    expect(markdown).toMatch(/^# Mi documento/);
    expect(markdown).toContain("Texto **fuerte** y [enlace](https://example.com/).");
    expect(markdown).toContain("- Primera idea");
    expect(markdown).toContain("```mermaid\nflowchart TD\nA --> B\n```");
    expect(markdown.match(/^# Mi documento$/m)).toHaveLength(1);
  });

  it("importa la exportación y recupera el documento sin duplicar el título", () => {
    const markdown = documentToMarkdown(source);
    const converted = markdownToDocument(markdown, {
      stripTitleHeading: true,
      titleFallback: "Documento importado",
    });
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: converted.title,
      content: converted.content,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.title).toBe("Mi documento");
    expect(parsed.stats.mermaidBlocks).toBe(1);
    expect(parsed.document.content.content?.filter((node) => node.type === "heading")).toHaveLength(0);
    expect(converted.warnings).toContain("Se quitó el H1 inicial porque repetía el título.");
    expect(JSON.stringify(parsed.document.content)).toContain("fuerte");
    expect(JSON.stringify(parsed.document.content)).toContain("https://example.com/");
  });

  it("exporta e importa listas de tareas y líneas horizontales", () => {
    const document: AulaDocument = {
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: "Tareas",
      content: {
        type: "doc",
        content: [
          {
            type: "taskList",
            content: [
              { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Hecha" }] }] },
              { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Pendiente" }] }] },
            ],
          },
          { type: "horizontalRule" },
        ],
      },
    };
    const markdown = documentToMarkdown(document);
    expect(markdown).toContain("- [x] Hecha");
    expect(markdown).toContain("- [ ] Pendiente");
    expect(markdown).toContain("---");

    const converted = markdownToDocument(markdown, { stripTitleHeading: true });
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title: converted.title,
      content: converted.content,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const blocks = parsed.document.content.content ?? [];
    expect(blocks[0]).toMatchObject({
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { checked: true } },
        { type: "taskItem", attrs: { checked: false } },
      ],
    });
    expect(blocks[1]).toEqual({ type: "horizontalRule" });
  });
});
