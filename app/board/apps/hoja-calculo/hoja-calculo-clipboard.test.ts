import { describe, expect, it } from "vitest";
import {
  AULA_DOCUMENT_MAX_TABLE_CELLS,
  AULA_DOCUMENT_MAX_TABLE_COLUMNS,
  AULA_DOCUMENT_MAX_TABLE_ROWS,
} from "../../../../lib/domain/aula-documentos/document-types";
import { buildSelectionClipboard } from "./hoja-calculo-clipboard";

describe("portapapeles de una selección", () => {
  it("serializa valores, celdas vacías y caracteres especiales", () => {
    const selection = [["Concepto", "Total"], ["Materiales", 13.5], ["", "a & <b>"]];
    const result = buildSelectionClipboard(selection);

    expect(result).toEqual({
      ok: true,
      kind: "table",
      rows: 3,
      columns: 2,
      html: "<table><tbody><tr><td>Concepto</td><td>Total</td></tr><tr><td>Materiales</td><td>13.5</td></tr><tr><td></td><td>a &amp; &lt;b&gt;</td></tr></tbody></table>",
      text: "Concepto\tTotal\r\nMateriales\t13.5\r\n\ta & <b>",
    });
    expect(selection).toEqual([["Concepto", "Total"], ["Materiales", 13.5], ["", "a & <b>"]]);
  });

  it("normaliza filas irregulares y conserva su forma", () => {
    const result = buildSelectionClipboard([["a"], ["b", "c"]]);

    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "table") throw new Error("Se esperaba una tabla.");
    expect(result.rows).toBe(2);
    expect(result.columns).toBe(2);
    expect(result.text).toBe("a\t\r\nb\tc");
    expect(result.html).toContain("<td>a</td><td></td>");
  });

  it("devuelve texto si solo hay una celda", () => {
    expect(buildSelectionClipboard([["hola"]])).toEqual({ ok: true, kind: "text", text: "hola" });
  });

  it("protege las fórmulas en el TSV de respaldo", () => {
    const result = buildSelectionClipboard([["=SUM(A1:A2)", "+import"]]);

    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "table") throw new Error("Se esperaba una tabla.");
    expect(result.text).toBe("'=SUM(A1:A2)\t'+import");
    expect(result.html).toContain("<td>=SUM(A1:A2)</td>");
  });

  it("conserva saltos de línea en HTML y los normaliza en TSV", () => {
    const result = buildSelectionClipboard([["uno\ndos", "a\tb"]]);

    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "table") throw new Error("Se esperaba una tabla.");
    expect(result.html).toContain("<td>uno<br>dos</td><td>a\tb</td>");
    expect(result.text).toBe("uno dos\ta b");
  });

  it("rechaza una selección vacía", () => {
    expect(buildSelectionClipboard([])).toMatchObject({ ok: false, code: "empty" });
    expect(buildSelectionClipboard([[]])).toMatchObject({ ok: false, code: "empty" });
  });

  it("respeta los límites de una tabla de Aula Documentos", () => {
    const rows = Array.from({ length: AULA_DOCUMENT_MAX_TABLE_ROWS + 1 }, () => ["x"]);
    const columns = [Array.from({ length: AULA_DOCUMENT_MAX_TABLE_COLUMNS + 1 }, () => "x")];
    const cells = Array.from({ length: 21 }, () => Array.from({ length: 20 }, () => "x"));

    expect(buildSelectionClipboard(rows)).toMatchObject({ ok: false, code: "too-many-rows" });
    expect(buildSelectionClipboard(columns)).toMatchObject({ ok: false, code: "too-many-columns" });
    expect(buildSelectionClipboard(cells)).toMatchObject({ ok: false, code: "too-many-cells" });
    expect(21 * 20).toBeGreaterThan(AULA_DOCUMENT_MAX_TABLE_CELLS);
    expect(buildSelectionClipboard(Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => "x"))))
      .toMatchObject({ ok: true, kind: "table", rows: 20, columns: 20 });
  });
});
