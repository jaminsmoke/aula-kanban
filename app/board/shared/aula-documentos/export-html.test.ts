import { describe, expect, it } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { buildAulaDocumentHtml, collectMermaidCodes, countMermaidBlocks, renderAulaContentHtml, renderMermaidSvgs } from "./export-html";

/**
 * Documento con texto y dos diagramas (uno repetido).
 * @returns Documento de prueba.
 */
function documentWithDiagrams(): AulaDocument {
  return {
    schemaVersion: 1,
    title: "Documento exportable",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Texto con un diagrama." }],
        },
        { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Otro diagrama." }],
        },
        { type: "mermaidBlock", attrs: { code: "sequenceDiagram\nA->>B: Hola" } },
        { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
      ],
    },
  };
}

describe("exportación HTML de Aula Documentos", () => {
  it("inserta los SVG y conserva el texto sin recursos externos", () => {
    const document = documentWithDiagrams();
    const html = buildAulaDocumentHtml(document, new Map([
      ["flowchart TD\nA --> B", '<svg data-testid="flujo"><text>Flujo</text></svg>'],
      ["sequenceDiagram\nA->>B: Hola", '<svg data-testid="secuencia"><text>Secuencia</text></svg>'],
    ]));

    expect(html).toContain("<title>Documento exportable</title>");
    expect(html).toContain("Texto con un diagrama.");
    expect(html).toContain('data-testid="flujo"');
    expect(html).toContain('data-testid="secuencia"');
    expect(html).not.toContain("data-mermaid-code");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("deja el código visible y explica el fallback si no hay SVG disponible", () => {
    const html = buildAulaDocumentHtml(documentWithDiagrams());
    expect(html).toContain("No se pudo dibujar el diagrama. Revisa el código Mermaid.");
    expect(html).toContain("<pre><code>flowchart TD\nA --&gt; B</code></pre>");
  });

  it("distingue un diagrama vacío de uno roto", () => {
    const document: AulaDocument = {
      schemaVersion: 1,
      title: "Vacío",
      content: {
        type: "doc",
        content: [{ type: "mermaidBlock", attrs: { code: "" } }],
      },
    };
    const html = buildAulaDocumentHtml(document);
    expect(html).toContain("El diagrama está vacío.");
    expect(html).not.toContain("No se pudo dibujar el diagrama.");
  });

  it("comparte el fallback con la presentación", () => {
    const html = renderAulaContentHtml({
      type: "doc",
      content: [{ type: "mermaidBlock", attrs: { code: "flowchart LR\nA -->" } }],
    });
    expect(html).toContain("No se pudo dibujar el diagrama. Revisa el código Mermaid.");
    expect(html).toContain("flowchart LR");
  });

  it("cuenta y deduplica los códigos Mermaid", () => {
    const document = documentWithDiagrams();
    expect(countMermaidBlocks(document.content)).toBe(3);
    expect(collectMermaidCodes(document.content)).toEqual([
      "flowchart TD\nA --> B",
      "sequenceDiagram\nA->>B: Hola",
    ]);
  });

  it("continúa la exportación si un diagrama no se puede renderizar", async () => {
    const rendered = await renderMermaidSvgs(
      ["flowchart TD\nA --> B", "flowchart LR\nA -->"],
      async (code) => {
        if (code.includes("LR")) throw new Error("sintaxis");
        return `<svg data-testid="ok">${code}</svg>`;
      },
    );

    expect(rendered.size).toBe(1);
    expect(rendered.get("flowchart TD\nA --> B")).toContain("data-testid=\"ok\"");
  });
});
