import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { parseAulaDocument } from "../../../../../lib/domain/aula-documentos/document-validation";
import { createAulaDocumentExtensions } from "./document-extensions";

/**
 * Pega HTML en una instancia real del editor de Aula.
 * @param html - Fragmento de tabla que llega desde el portapapeles.
 * @returns El documento Tiptap resultante.
 */
function pasteTable(html: string) {
  const editor = new Editor({
    extensions: createAulaDocumentExtensions(),
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
  try {
    (editor.view as unknown as { pasteHTML: (value: string, event: object) => void }).pasteHTML(html, {});
    return editor.getJSON();
  } finally {
    editor.destroy();
  }
}

/**
 * Envuelve filas HTML en una tabla.
 * @param rows - Filas ya escapadas.
 * @returns Una tabla HTML.
 */
function table(rows: string) {
  return `<table><tbody>${rows}</tbody></table>`;
}

describe("pegado de tablas en Aula Documentos", () => {
  it("crea una tabla editable con los valores del portapapeles", () => {
    const content = pasteTable(table(
      "<tr><td>Concepto</td><td>Total</td></tr><tr><td>Materiales</td><td>13,5</td></tr>",
    ));

    expect(JSON.stringify(content)).toContain('"type":"table"');
    expect(JSON.stringify(content)).toContain('"text":"Materiales"');
    expect(parseAulaDocument({ schemaVersion: 3, title: "Tabla", content }).ok).toBe(true);
  });

  it("conserva celdas vacías y saltos de línea", () => {
    const content = pasteTable(table("<tr><td>uno<br>dos</td><td></td></tr>"));

    expect(JSON.stringify(content)).toContain('"type":"hardBreak"');
    expect(JSON.stringify(content)).toContain('"type":"tableCell"');
    expect(parseAulaDocument({ schemaVersion: 3, title: "Tabla", content }).ok).toBe(true);
  });

  it("el editor acepta el pegado pero la validación rechaza más de 50 filas", () => {
    const content = pasteTable(table("<tr><td>dato</td><td>otro</td></tr>".repeat(51)));
    const parsed = parseAulaDocument({ schemaVersion: 3, title: "Tabla", content });

    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? "ok" : parsed.code).toBe("table-too-large");
  });
});
