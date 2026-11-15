import { beforeAll, describe, expect, it } from "vitest";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => new DOMRect(0, 0, 100, 20),
  });
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value: () => 100,
  });
});

describe("Conversión Mermaid a Excalidraw", () => {
  it("convierte un diagrama de flujo sencillo", async () => {
    const { elements } = await parseMermaidToExcalidraw(
      "flowchart TD\n  A[Inicio] --> B[Fin]",
    );

    expect(elements.some((element) => element.type === "rectangle")).toBe(true);
    expect(elements.some((element) => element.type === "arrow")).toBe(true);
  }, 15000);
});
