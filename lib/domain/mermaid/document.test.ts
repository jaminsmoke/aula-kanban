import { describe, expect, it } from "vitest";
import { validarDocumentoMermaid } from "./document";

describe("documento de Mermaid", () => {
  it("acepta un documento con code textual y conserva las claves desconocidas", () => {
    const documento = { code: "flowchart TD\n  A --> B", tema: "oscuro", version: 3 };
    expect(validarDocumentoMermaid(documento)).toBe(documento);
    expect(validarDocumentoMermaid(documento)?.tema).toBe("oscuro");
    expect(validarDocumentoMermaid(documento)?.version).toBe(3);
  });

  it("acepta un documento mínimo y un código vacío", () => {
    expect(validarDocumentoMermaid({ code: "flowchart TD" })).toEqual({ code: "flowchart TD" });
    expect(validarDocumentoMermaid({ code: "" })).toEqual({ code: "" });
  });

  it("rechaza valores sin code textual", () => {
    for (const value of [
      null,
      undefined,
      [],
      ["code"],
      "flowchart TD",
      42,
      {},
      { code: 1 },
      { code: null },
      { code: ["flowchart TD"] },
      { code: { texto: "flowchart TD" } },
      { codigo: "flowchart TD" },
    ]) {
      expect(validarDocumentoMermaid(value), JSON.stringify(value)).toBeNull();
    }
  });
});
