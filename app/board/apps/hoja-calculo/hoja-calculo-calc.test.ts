import { describe, expect, it } from "vitest";
import { buildFormulaSheet, computeSheetDisplay, extractFormulaMap, formulaCellKey } from "./hoja-calculo-calc";

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
  });
});
