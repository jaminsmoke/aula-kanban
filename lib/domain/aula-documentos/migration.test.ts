import { describe, expect, it } from "vitest";
import { createEmptyAulaDocument, parseAulaDocument } from "./document";
import { buildAulaMigrationDocument } from "./migration";

const notes = {
  title: "Notas de clase",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Contenido de notas." }] }],
  },
};
const diagram = { code: "flowchart TD\n  A --> B" };
const presentation = { markdown: "# Presentación\n\nPrimera diapositiva.\n\n---\n\n## Segunda" };

/**
 * Extrae todo el texto de un documento para comprobarlo sin depender del orden exacto.
 * @param value - Documento validado.
 * @returns Texto concatenado del árbol.
 */
function allText(value: unknown): string {
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (typeof value !== "object" || value === null) return "";
  const record = value as { text?: unknown; content?: unknown };
  return `${typeof record.text === "string" ? record.text : ""} ${allText(record.content)}`;
}

describe("migración documental", () => {
  it("conserva el único origen cuando Aula está vacía", () => {
    const result = buildAulaMigrationDocument({
      existing: null,
      sources: [{ source: "documentos", state: notes, updatedAt: 4 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Notas de clase");
    expect(result.importedSources).toEqual(["documentos"]);
    expect(allText(result.document.content)).toContain("Contenido de notas.");
  });

  it("combina varios orígenes en secciones", () => {
    const result = buildAulaMigrationDocument({
      existing: null,
      sources: [
        { source: "documentos", state: notes, updatedAt: 4 },
        { source: "mermaid", state: diagram, updatedAt: 5 },
        { source: "presentaciones", state: presentation, updatedAt: 6 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Documentos migrados");
    expect(result.importedSources).toEqual(["documentos", "mermaid", "presentaciones"]);
    const text = allText(result.document.content);
    expect(text).toContain("Migrado desde Notas y documentos");
    expect(text).toContain("Migrado desde Diagramas");
    expect(text).toContain("Migrado desde Presentaciones");
    expect(parseAulaDocument(result.document).ok).toBe(true);
  });

  it("añade los datos antiguos sin borrar el documento actual de Aula", () => {
    const existing = createEmptyAulaDocument("Trabajo actual");
    existing.content = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "No borrar." }] }],
    };
    const result = buildAulaMigrationDocument({
      existing,
      sources: [{ source: "mermaid", state: diagram, updatedAt: 8 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.title).toBe("Trabajo actual");
    expect(allText(result.document.content)).toContain("No borrar.");
    expect(JSON.stringify(result.document.content)).toContain("flowchart TD");
  });

  it("omite orígenes inválidos y devuelve avisos", () => {
    const result = buildAulaMigrationDocument({
      existing: null,
      sources: [
        { source: "documentos", state: { title: "Roto" }, updatedAt: 1 },
        { source: "mermaid", state: diagram, updatedAt: 2 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.importedSources).toEqual(["mermaid"]);
    expect(result.warnings.join(" ")).toContain("Notas y documentos");
  });

  it("falla si ningún origen es válido", () => {
    const result = buildAulaMigrationDocument({
      existing: null,
      sources: [{ source: "documentos", state: { title: "Roto" }, updatedAt: 1 }],
    });
    expect(result.ok).toBe(false);
  });
});
