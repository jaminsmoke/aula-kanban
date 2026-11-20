import { describe, expect, it } from "vitest";
import { parseAulaDocument } from "./document";
import { readAulaMermaidCode, writeAulaMermaidCode } from "./mermaid-compat";

/**
 * Construye un documento válido con un diagrama y texto.
 * @param code - Código Mermaid inicial.
 * @returns Documento listo para validar.
 */
function documentWithDiagram(code: string) {
  return {
    schemaVersion: 3,
    title: "Documento",
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Antes." }] },
        { type: "mermaidBlock", attrs: { code } },
        { type: "paragraph", content: [{ type: "text", text: "Después." }] },
      ],
    },
  };
}

describe("compatibilidad MCP de diagramas", () => {
  it("lee el primer bloque Mermaid", () => {
    const result = readAulaMermaidCode(documentWithDiagram("flowchart TD\nA --> B"));
    expect(result).toMatchObject({ ok: true, code: "flowchart TD\nA --> B" });
  });

  it("actualiza solo el primer diagrama y conserva el resto", () => {
    const initial = documentWithDiagram("flowchart TD\nA --> B");
    initial.content.content.push({ type: "mermaidBlock", attrs: { code: "sequenceDiagram\nA->>B: Hola" } });

    const result = writeAulaMermaidCode(initial, "flowchart LR\nC --> D");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.document.content);
    expect(serialized).toContain("flowchart LR");
    expect(serialized).toContain("sequenceDiagram");
    expect(serialized).toContain("Antes.");
    expect(parseAulaDocument(result.document).ok).toBe(true);
  });

  it("añade un diagrama al final si el documento no tiene ninguno", () => {
    const result = writeAulaMermaidCode({
      schemaVersion: 3,
      title: "Solo texto",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hola." }] }] },
    }, "flowchart TD\nNuevo --> Diagrama");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(readAulaMermaidCode(result.document)).toMatchObject({
      ok: true,
      code: "flowchart TD\nNuevo --> Diagrama",
    });
  });

  it("rechaza documentos que no cumplen el esquema", () => {
    expect(readAulaMermaidCode({ schemaVersion: 99 })).toMatchObject({ ok: false });
    expect(writeAulaMermaidCode({ schemaVersion: 99 }, "flowchart TD")).toMatchObject({ ok: false });
  });
});
