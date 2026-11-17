import { describe, expect, it } from "vitest";
import {
  STARTER_SHEET,
  columnLabel,
  createEmptySheet,
  csvCell,
  normalizeSheet,
  parseSpreadsheetDocument,
  selectionToRange,
  toCsv,
} from "./hoja-calculo-model";

describe("modelo de hoja de cálculo", () => {
  it("crea una hoja vacía con dimensiones mínimas", () => {
    const sheet = createEmptySheet(4, 3);
    expect(sheet).toHaveLength(4);
    expect(sheet[0]).toEqual(["", "", ""]);
  });

  it("normaliza filas incompletas y conserva las fórmulas", () => {
    const sheet = normalizeSheet([["Total", "=SUM(A1:A2)"]], 3, 3);
    expect(sheet).toHaveLength(3);
    expect(sheet[0]).toEqual(["Total", "=SUM(A1:A2)", ""]);
    expect(sheet[2]).toEqual(["", "", ""]);
  });

  it("convierte coordenadas a rangos A1", () => {
    expect(columnLabel(0)).toBe("A");
    expect(columnLabel(25)).toBe("Z");
    expect(columnLabel(26)).toBe("AA");
    expect(selectionToRange([0, 0, 1, 1])).toBe("A1:B2");
    expect(selectionToRange([2, 3, 2, 3])).toBe("C4");
  });

  it("protege las celdas CSV que empiezan por fórmula", () => {
    expect(csvCell("hola")).toBe('"hola"');
    expect(csvCell('=SUM(A1:A2)')).toBe("\"'=SUM(A1:A2)\"");
    expect(csvCell("+import")).toBe("\"'+import\"");
    expect(toCsv([["a", "b"], ["1", "=A1"]])).toBe('"a","b"\r\n"1","\'=A1"\r\n');
  });

  it("valida documentos guardados", () => {
    expect(parseSpreadsheetDocument({ data: STARTER_SHEET })?.data).toHaveLength(20);
    expect(parseSpreadsheetDocument({ data: [["x", 1, true]] })).not.toBeNull();
    expect(parseSpreadsheetDocument({ data: [] })).toBeNull();
    expect(parseSpreadsheetDocument({ data: [[{}]] })).toBeNull();
    expect(parseSpreadsheetDocument(null)).toBeNull();
  });
});
