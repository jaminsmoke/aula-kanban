import { describe, expect, it } from "vitest";
import { buildFormulaSheet, calculateSheet, computeSheetDisplay, extractFormulaMap, formulaCellKey } from "./hoja-calculo-calc";
import { toCsv } from "./hoja-calculo-model";

describe("capa de cálculo de la hoja", () => {
  it("extrae las fórmulas y calcula los valores visibles", () => {
    const data = [
      ["Concepto", "Cantidad", "Precio", "Total"],
      ["Materiales", 3, 4.5, "=B2*C2"],
      ["Total", "", "", "=SUM(D2:D2)"],
    ];
    const formulas = extractFormulaMap(data);
    expect(formulas.get(formulaCellKey(1, 3))).toBe("=B2*C2");
    expect(computeSheetDisplay(data)[1][3]).toBe(13.5);
    expect(computeSheetDisplay(data)[2][3]).toBe(13.5);
  });

  it("vuelve a colocar las fórmulas sobre los valores mostrados", () => {
    const display = [
      ["Materiales", 3, 4.5, 13.5],
      ["Total", "", "", 13.5],
    ];
    const formulas = new Map([
      [formulaCellKey(0, 3), "=B1*C1"],
      [formulaCellKey(1, 3), "=SUM(D1:D1)"],
    ]);
    const data = buildFormulaSheet(display, formulas);

    expect(data[0][3]).toBe("=B1*C1");
    expect(data[1][3]).toBe("=SUM(D1:D1)");
    expect(data[0][1]).toBe(3);
    const csv = toCsv(data);
    expect(csv).toContain("\"'=B1*C1\"");
    expect(csv).toContain("\"'=SUM(D1:D1)\"");
    expect(csv).not.toContain("13.5");
  });

  it("resume fórmulas, errores y límites para la interfaz", () => {
    const calculation = calculateSheet([
      ["Materiales", 3, 4.5, "=B1*C1"],
      ["División", "", "", "=1/0"],
      ["Rango", "", "", "=SUM(A1:ZZ1000)"],
    ]);

    expect(calculation.summary.formulas).toBe(3);
    expect(calculation.summary.errors).toEqual([
      expect.objectContaining({ label: "D2", error: "#DIV/0!" }),
      expect.objectContaining({ label: "D3", error: "#VALOR!", limit: "rangeCells" }),
    ]);
  });
});
