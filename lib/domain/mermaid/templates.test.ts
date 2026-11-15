import { describe, expect, it } from "vitest";
import { MERMAID_TEMPLATES } from "./templates";

describe("plantillas de Mermaid", () => {
  it("mantiene las seis plantillas de la app con identificadores únicos", () => {
    expect(MERMAID_TEMPLATES.map((template) => template.id)).toEqual([
      "flujo",
      "secuencia",
      "gantt",
      "clases",
      "estados",
      "tiempo",
    ]);
    expect(new Set(MERMAID_TEMPLATES.map((template) => template.id)).size).toBe(MERMAID_TEMPLATES.length);
  });

  it("ofrece etiquetas y códigos utilizables en cada plantilla", () => {
    for (const template of MERMAID_TEMPLATES) {
      expect(template.label.trim(), template.id).not.toBe("");
      expect(template.code.trim(), template.id).not.toBe("");
    }
  });

  it("cubre los tipos de diagrama que anuncia cada identificador", () => {
    const tipos = Object.fromEntries(MERMAID_TEMPLATES.map((template) => [template.id, template.code.split("\n")[0].trim()]));
    expect(tipos).toEqual({
      flujo: "flowchart TD",
      secuencia: "sequenceDiagram",
      gantt: "gantt",
      clases: "classDiagram",
      estados: "stateDiagram-v2",
      tiempo: "timeline",
    });
  });
});
