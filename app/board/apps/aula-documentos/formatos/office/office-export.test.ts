// @vitest-environment node

import { materializeDocxDocument, materializePptxPresentation } from "@silurus/ooxml/node";
import { describe, expect, it } from "vitest";
import type { AulaDocument } from "../../../../../../lib/domain/aula-documentos/document";
import type { AulaImageAsset } from "../../../../../../lib/domain/aula-documentos/image-assets";
import { imageBase64ToBytes } from "../../../../../../lib/domain/aula-documentos/image-assets";
import { exportAulaDocx, exportAulaPptx } from "./office-export";

const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nTQAAAAASUVORK5CYII=";
const TINY_PNG = imageBase64ToBytes(TINY_PNG_BASE64);

/**
 * Crea una imagen resuelta para las pruebas.
 * @param source - URL interna.
 * @returns La imagen con datos Office.
 */
function imageAsset(source: string): AulaImageAsset {
  return {
    source,
    mime: "image/png",
    bytes: TINY_PNG,
    base64: TINY_PNG_BASE64,
    dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
    width: 1,
    height: 1,
    office: {
      mime: "image/png",
      bytes: TINY_PNG,
      base64: TINY_PNG_BASE64,
      dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      width: 1,
      height: 1,
    },
  };
}

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
  });

  it("conserva cabeceras y spans en DOCX y PPTX", async () => {
    const merged: AulaDocument = {
      schemaVersion: 3,
      title: "Tabla combinada",
      content: {
        type: "doc",
        content: [{
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [{ type: "tableHeader", attrs: { colspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Cabecera" }] }] }],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", attrs: { rowspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Lateral" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Dato" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Final" }] }] }],
            },
          ],
        }],
      },
    };

    const docx = await materializeDocxDocument(new Uint8Array(await (await exportAulaDocx(merged)).blob.arrayBuffer()));
    expect(JSON.stringify(docx.body)).toContain('"colSpan":2');
    expect(JSON.stringify(docx.body)).toContain('"vMerge":true');

    const pptx = await materializePptxPresentation(new Uint8Array(await (await exportAulaPptx(merged)).blob.arrayBuffer()));
    const table = JSON.stringify(pptx.slides);
    expect(table).toContain('"gridSpan":2');
    expect(table).toContain('"rowSpan":2');
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

  it("incrusta imágenes con texto alternativo y pie en DOCX", async () => {
    const source = "/api/files/foto";
    const withImage: AulaDocument = {
      schemaVersion: 3,
      title: "Informe con imagen",
      content: {
        type: "doc",
        content: [
          {
            type: "aulaImage",
            attrs: { src: source, alt: "Foto de clase", caption: "Grupo de 3.º", width: 60, alignment: "center" },
          },
        ],
      },
    };

    const result = await exportAulaDocx(withImage, new Map([[source, imageAsset(source)]]));
    expect(result.blob.size).toBeGreaterThan(1_000);
    expect(result.warnings.join(" ")).not.toContain("no se pudo incrustar");

    const parsed = await materializeDocxDocument(new Uint8Array(await result.blob.arrayBuffer()));
    const text = JSON.stringify(parsed.body);
    expect(text).toContain('"type":"image"');
    expect(text).toContain("Grupo de 3.º");
  });

  it("incrusta imágenes con texto alternativo y pie en PPTX", async () => {
    const source = "/api/files/foto";
    const withImage: AulaDocument = {
      schemaVersion: 3,
      title: "Presentación con imagen",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Diapositiva" }] },
          {
            type: "aulaImage",
            attrs: { src: source, alt: "Foto de clase", caption: "Grupo de 3.º", width: 60, alignment: "center" },
          },
        ],
      },
    };

    const result = await exportAulaPptx(withImage, {}, new Map([[source, imageAsset(source)]]));
    expect(result.blob.size).toBeGreaterThan(1_000);
    expect(result.warnings.join(" ")).not.toContain("no se pudo incrustar");

    const presentation = await materializePptxPresentation(new Uint8Array(await result.blob.arrayBuffer()));
    const text = JSON.stringify(presentation.slides);
    expect(text).toContain('"type":"picture"');
    expect(text).toContain("Grupo de 3.º");
  });

  it("avisa si falta una imagen sin romper la exportación", async () => {
    const withImage: AulaDocument = {
      schemaVersion: 3,
      title: "Imagen perdida",
      content: {
        type: "doc",
        content: [{
          type: "aulaImage",
          attrs: { src: "/api/files/perdida", alt: "Cartel", caption: "Pie", width: 100, alignment: "center" },
        }],
      },
    };

    const docx = await exportAulaDocx(withImage);
    const pptx = await exportAulaPptx(withImage);
    expect(docx.warnings.join(" ")).toContain("no se pudo incrustar");
    expect(pptx.warnings.join(" ")).toContain("no se pudo incrustar");
    expect(docx.blob.size).toBeGreaterThan(500);
    expect(pptx.blob.size).toBeGreaterThan(500);
  });
});
