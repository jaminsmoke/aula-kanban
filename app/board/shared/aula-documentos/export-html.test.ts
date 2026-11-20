import { describe, expect, it } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { buildAulaDocumentHtml, buildAulaPresentationHtml, collectMermaidCodes, countMermaidBlocks, renderAulaContentHtml, renderMermaidSvgs } from "./export-html";

/**
 * Documento con texto y dos diagramas (uno repetido).
 * @returns Documento de prueba.
 */
function documentWithDiagrams(): AulaDocument {
  return {
    schemaVersion: 3,
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
    expect(html).toContain("background: #fff");
    expect(html).toContain("background: #f7f8fc");
    expect(html).toContain('data-testid="flujo"');
    expect(html).toContain('data-testid="secuencia"');
    expect(html).not.toContain("data-mermaid-code");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("exporta tablas importadas de Office", () => {
    const html = renderAulaContentHtml({
      type: "doc",
      content: [{
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
      }],
    });

    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html).toContain("<th><p>A</p></th>");
    expect(html).toContain("<td><p>2</p></td>");
  });

  it("conserva cabeceras y spans al exportar HTML", () => {
    const html = renderAulaContentHtml({
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
    });

    expect(html).toContain('<th colspan="2"');
    expect(html).toContain('<td rowspan="2"');
    expect(html).toContain("Cabecera");
  });

  it("deja el código visible y explica el fallback si no hay SVG disponible", () => {
    const html = buildAulaDocumentHtml(documentWithDiagrams());
    expect(html).toContain("No se pudo dibujar el diagrama. Revisa el código Mermaid.");
    expect(html).toContain("<pre><code>flowchart TD\nA --&gt; B</code></pre>");
  });

  it("exporta alineación y listas de tareas", () => {
    const document: AulaDocument = {
      schemaVersion: 3,
      title: "Formato",
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Centrado" }] },
          {
            type: "taskList",
            content: [
              { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Hecha" }] }] },
              { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Pendiente" }] }] },
            ],
          },
        ],
      },
    };
    const html = buildAulaDocumentHtml(document);

    expect(html).toContain("text-align: center");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain("Hecha");
    expect(html).toContain("Pendiente");
    expect(html).toContain("line-through");
  });

  it("distingue un diagrama vacío de uno roto", () => {
    const document: AulaDocument = {
      schemaVersion: 3,
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

  it("exporta imágenes con texto alternativo, pie y ancho embebido", () => {
    const source = "/api/files/foto";
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const document: AulaDocument = {
      schemaVersion: 3,
      title: "Con imagen",
      content: {
        type: "doc",
        content: [{
          type: "aulaImage",
          attrs: { src: source, alt: "Foto de clase", caption: "Grupo de 3.º", width: 80, alignment: "left" },
        }],
      },
    };

    const html = buildAulaDocumentHtml(document, new Map(), new Map([[source, dataUrl]]));
    expect(html).toContain('class="aula-image-block is-left"');
    expect(html).toContain(`src="${dataUrl}"`);
    expect(html).toContain('alt="Foto de clase"');
    expect(html).toContain('style="width: 80%;"');
    expect(html).toContain("<figcaption>Grupo de 3.º</figcaption>");
    expect(html).not.toContain(source);
  });

  it("deja un aviso visible si una imagen ya no se puede leer", () => {
    const source = "/api/files/perdida";
    const document: AulaDocument = {
      schemaVersion: 3,
      title: "Imagen perdida",
      content: {
        type: "doc",
        content: [{
          type: "aulaImage",
          attrs: { src: source, alt: "Cartel", caption: "Pie", width: 100, alignment: "center" },
        }],
      },
    };

    const html = buildAulaDocumentHtml(document, new Map(), new Map(), new Set([source]));
    expect(html).toContain("Imagen no disponible: Cartel");
    expect(html).toContain("aula-image-missing");
    expect(html).not.toContain(`src="${source}"`);
  });

  it("exporta diapositivas estáticas con tema y notas sin recursos externos", () => {
    const html = buildAulaPresentationHtml(
      {
        schemaVersion: 3,
        title: "Presentación de clase",
        content: { type: "doc", content: [] },
      },
      ["<h2>Primera</h2><p>Contenido.</p>", "<h2>Segunda</h2>"],
      { theme: "claro", notes: { "0": "Nota privada" } },
    );
    expect(html).toContain("<title>Presentación de clase</title>");
    expect(html).toContain('class="slide"');
    expect(html).toContain("Notas del orador");
    expect(html).toContain("Nota privada");
    expect(html).toContain("background: #f4f3f8");
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html.match(/class="slide"/g)).toHaveLength(2);
  });

  it("puede omitir las notas en la exportación", () => {
    const html = buildAulaPresentationHtml(
      { schemaVersion: 3, title: "Sin notas", content: { type: "doc", content: [] } },
      ["<h2>Una</h2>"],
      { theme: "oscuro", notes: { "0": "No debe salir" }, includeNotes: false },
    );
    expect(html).not.toContain("No debe salir");
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
