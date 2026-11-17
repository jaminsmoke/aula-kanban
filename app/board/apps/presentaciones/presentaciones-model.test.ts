import { describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN, parseInline, parseSlides } from "./presentaciones-model";

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
});
