import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKDOWN,
  MAX_MARKDOWN_LENGTH,
  PRESETS,
  exportPresentationHtml,
  parseInline,
  parsePresentationDocument,
  parseSlides,
  presetInfo,
  serializePresentation,
} from "./presentaciones-model";

describe("modelo de Presentaciones", () => {
  it("separa las diapositivas del documento inicial", () => {
    const slides = parseSlides(DEFAULT_MARKDOWN);
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe("Nuestra presentación");
    expect(slides[1].title).toBe("Primera idea");
    expect(slides[2].title).toBe("Para terminar");
  });

  it("interpreta títulos, listas, citas y código", () => {
    const [slide] = parseSlides("# Título\n\n- Uno\n- Dos\n\n> Cita\n\n```\ncódigo\n```");
    expect(slide.blocks).toEqual([
      { type: "heading", level: 1, text: "Título" },
      { type: "list", ordered: false, items: ["Uno", "Dos"] },
      { type: "quote", text: "Cita" },
      { type: "code", text: "código" },
    ]);
  });

  it("mantiene un documento vacío como una diapositiva vacía", () => {
    expect(parseSlides("")).toEqual([{ title: "Diapositiva 1", blocks: [] }]);
  });

  it("interpreta formato inline seguro", () => {
    expect(parseInline("Hola **mundo** y *clase* con `código`")).toEqual([
      { text: "Hola " },
      { text: "mundo", bold: true },
      { text: " y " },
      { text: "clase", italic: true },
      { text: " con " },
      { text: "código", code: true },
    ]);
    expect(parseInline("[Aula](https://example.com)")).toEqual([
      { text: "Aula", href: "https://example.com" },
    ]);
  });

  it("no interpreta HTML crudo ni enlaces no seguros", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ text: "<script>alert(1)</script>" }]);
    expect(parseInline("[malo](javascript:foo)")).toEqual([{ text: "[malo](javascript:foo)" }]);
  });

  it("ofrece plantillas de clase, proyecto y documento vacío", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["clase", "proyecto", "blanco"]);
    expect(presetInfo("proyecto").markdown).toContain("Presentación del proyecto");
    expect(presetInfo("blanco").markdown).toBe("# Nueva presentación\n");
  });

  it("serializa y valida el documento guardado", () => {
    expect(serializePresentation("# Hola")).toEqual({ markdown: "# Hola" });
    expect(parsePresentationDocument({ markdown: "# Hola" })).toEqual({ markdown: "# Hola" });
    expect(parsePresentationDocument({ markdown: 4 })).toBeNull();
    expect(parsePresentationDocument({ markdown: "x".repeat(MAX_MARKDOWN_LENGTH + 1) })).toBeNull();
  });

  it("exporta HTML autónomo y escapa el contenido", () => {
    const html = exportPresentationHtml("# Hola\n\n<script>alert(1)</script>\n\n---\n\n## Dos");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Hola");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("background:#fff");
    expect(html).toContain("color:#1c2a5a");
    expect(html.match(/class="slide/g)).toHaveLength(2);
  });
});
