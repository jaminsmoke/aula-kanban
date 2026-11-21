// @vitest-environment node

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { materializeDocxDocument, materializePptxPresentation } from "@silurus/ooxml/node";

const fixture = (name: string) => readFile(new URL(`./__fixtures__/${name}`, import.meta.url));

type TextRunLike = { text?: string; isLink?: boolean; hyperlink?: string | null };
type ParagraphLike = {
  type?: string;
  styleId?: string;
  runs?: TextRunLike[];
  numbering?: { format?: string } | null;
  rows?: unknown[];
};
type SlideLike = {
  elements: Array<{ textBody?: { paragraphs: Array<{ runs?: TextRunLike[] }> } }>;
};

/**
 * Extrae el texto de una presentación de prueba.
 * @param presentation - Presentación materializada.
 * @returns Las líneas de texto por diapositiva.
 */
function presentationText(presentation: Awaited<ReturnType<typeof materializePptxPresentation>>): string[] {
  return (presentation.slides as SlideLike[]).flatMap((slide) => slide.elements.flatMap((element) => (
    element.textBody?.paragraphs.flatMap((paragraph) => (
      paragraph.runs?.map((run) => run.text ?? "").join("") ?? []
    )) ?? []
  )));
}

describe("fixtures Office de importación", () => {
  it("extrae encabezados, enlaces, listas y tablas de DOCX", async () => {
    const document = await materializeDocxDocument(await fixture("import-basico.docx"));

    expect(document.body).toHaveLength(5);
    const heading = document.body[0] as ParagraphLike;
    expect(heading.type).toBe("paragraph");
    expect(heading.styleId).toBe("Heading1");
    expect(heading.runs?.[0]?.text).toBe("Informe de prueba");

    const linked = document.body[1] as ParagraphLike;
    expect(linked.runs?.some((run) => run.isLink && run.hyperlink === "https://example.com")).toBe(true);
    expect(linked.runs?.some((run) => run.text === "un enlace")).toBe(true);

    const bullet = document.body[2] as ParagraphLike;
    expect(bullet.numbering?.format).toBe("bullet");

    const table = document.body[4] as ParagraphLike;
    expect(table.type).toBe("table");
    expect(table.rows).toHaveLength(2);
  });

  it("extrae el texto y las diapositivas de PPTX", async () => {
    const presentation = await materializePptxPresentation(await fixture("import-basico.pptx"));

    expect(presentation.slides).toHaveLength(2);
    expect(presentationText(presentation)).toEqual([
      "Presentación de prueba",
      "Primer punto",
      "Segundo punto",
      "Segunda diapositiva",
      "Contenido de la segunda diapositiva.",
    ]);
  });
});
