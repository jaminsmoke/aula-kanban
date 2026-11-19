import { describe, expect, it } from "vitest";
import { mermaidFileName } from "./mermaid-filename";

describe("nombre de archivo de Diagramas", () => {
  it("usa el título de Mermaid cuando existe", () => {
    expect(mermaidFileName("---\ntitle: Flujo de clase\n---\nflowchart TD\n  A --> B")).toBe("flujo-de-clase.svg");
    expect(mermaidFileName("%% accTitle: Mapa del proyecto\ngraph LR")).toBe("mapa-del-proyecto.svg");
  });

  it("usa la primera línea del diagrama como fallback legible", () => {
    expect(mermaidFileName("graph TD\n  A --> B")).toBe("graph-td.svg");
    expect(mermaidFileName("flowchart LR")).toBe("flowchart-lr.svg");
  });

  it("evita el projectId y usa un nombre genérico si no hay contenido", () => {
    expect(mermaidFileName("   \n\n")).toBe("diagrama.svg");
  });
});
