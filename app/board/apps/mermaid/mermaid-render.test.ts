import { describe, expect, it } from "vitest";
import { createMermaidRenderer, normalizeSvg } from "./mermaid-render";

describe("render de Mermaid", () => {
  it("da al SVG exterior el tamaño de su viewBox", () => {
    const svg = '<svg style="max-width:120px" width="10" height="20" viewBox="0 0 320 200"><g /></svg>';
    expect(normalizeSvg(svg)).toContain('width="320"');
    expect(normalizeSvg(svg)).toContain('height="200"');
    expect(normalizeSvg(svg)).toContain('style="max-width:none"');
  });

  it("deja intacto un SVG sin viewBox", () => {
    const svg = '<svg width="10"><g /></svg>';
    expect(normalizeSvg(svg)).toBe(svg);
  });

  it("vacía la vista previa sin cargar el motor", async () => {
    const renderer = createMermaidRenderer();
    expect(await renderer.render("   ")).toBe("");
  });
});
