// @vitest-environment node

import { materializeDocxDocument, materializePptxPresentation } from "@silurus/ooxml/node";
import { describe, expect, it } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { exportAulaDocx, exportAulaPptx } from "./office-export";

const document: AulaDocument = {
  schemaVersion: 3,
  title: "Informe de exportación",
  content: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Informe de exportación" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Texto " },
          { type: "text", text: "fuerte", marks: [{ type: "bold" }] },
          { type: "text", text: " con " },
          {
            type: "text",
            text: "enlace",
            marks: [{
              type: "link",
              attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer nofollow" },
            }],
          },
          { type: "text", text: "." },
        ],
      },
      {
        type: "bulletList",
        content: [{
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Primer punto" }] }],
        }],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "2" }] }] },
            ],
          },
        ],
      },
      { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
      { type: "slideBreak" },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Segunda diapositiva" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Contenido final." }] },
    ],
  },
};

describe("exportación Office", () => {
  it("genera un DOCX reabrible con tablas y avisos", async () => {
    const result = await exportAulaDocx(document);
    expect(result.blob.size).toBeGreaterThan(1_000);
    expect(result.warnings.join(" ")).toContain("Mermaid");

    const parsed = await materializeDocxDocument(new Uint8Array(await result.blob.arrayBuffer()));
    expect(parsed.body.some((node) => node.type === "table")).toBe(true);
    expect(JSON.stringify(parsed.body)).toContain("Informe de exportación");
    expect(JSON.stringify(parsed.body)).toContain("Primer punto");
    expect(JSON.stringify(parsed.body)).toContain("https://example.com");
  });

  it("genera un PPTX reabrible con diapositivas y notas", async () => {
    const result = await exportAulaPptx(document, { 0: "Nota de la primera diapositiva." });
    expect(result.blob.size).toBeGreaterThan(1_000);

    const presentation = await materializePptxPresentation(new Uint8Array(await result.blob.arrayBuffer()));
    expect(presentation.slides).toHaveLength(2);
    const text = JSON.stringify(presentation.slides);
    expect(text).toContain("Informe de exportación");
    expect(text).toContain("Contenido final.");
    expect(text).toContain("Nota de la primera diapositiva.");
    expect(result.warnings.join(" ")).toContain("tablas");
  });

  it("exporta documentos vacíos de forma repetible", async () => {
    const empty: AulaDocument = {
      schemaVersion: 3,
      title: "Vacío",
      content: { type: "doc", content: [] },
    };
    const firstDocx = await exportAulaDocx(empty);
    const secondDocx = await exportAulaDocx(empty);
    const pptx = await exportAulaPptx(empty);

    expect(firstDocx.blob.size).toBeGreaterThan(500);
    expect(secondDocx.blob.size).toBeGreaterThan(500);
    expect(pptx.blob.size).toBeGreaterThan(500);
  });
});
