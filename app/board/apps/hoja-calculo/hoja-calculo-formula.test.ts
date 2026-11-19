import { describe, expect, it } from "vitest";
import { evaluateSheetFormulas, MAX_FORMULA_LENGTH, type FormulaResult, type FormulaValue } from "./hoja-calculo-formula";

function valueAt(results: FormulaResult[][], row: number, column: number): FormulaValue {
  const result = results[row][column];
  if (!result.ok) throw new Error(`La celda ${row}:${column} falló con ${result.error}`);
  return result.value;
}

function errorAt(results: FormulaResult[][], row: number, column: number): string {
  const result = results[row][column];
  if (result.ok) throw new Error(`La celda ${row}:${column} no falló.`);
  return result.error;
}

describe("motor de fórmulas de Hoja de cálculo", () => {
  it("calcula operaciones, paréntesis y referencias", () => {
    const results = evaluateSheetFormulas([
      [2, 3, "=(A1+B1)*2"],
      ["=A1^2", "=ROUND(C1/3, 1)", "=ABS(-B1)"],
    ]);

    expect(valueAt(results, 0, 2)).toBe(10);
    expect(valueAt(results, 1, 0)).toBe(4);
    expect(valueAt(results, 1, 1)).toBe(3.3);
    expect(valueAt(results, 1, 2)).toBe(3);
  });

  it("calcula el presupuesto de ejemplo y sus totales", () => {
    const results = evaluateSheetFormulas([
      ["Concepto", "Cantidad", "Precio", "Total"],
      ["Materiales", 3, 4.5, "=B2*C2"],
      ["Impresión", 1, 12, "=B3*C3"],
      ["Transporte", 2, 3.25, "=B4*C4"],
      ["Total", "", "", "=SUM(D2:D4)"],
    ]);

    expect(valueAt(results, 1, 3)).toBe(13.5);
    expect(valueAt(results, 2, 3)).toBe(12);
    expect(valueAt(results, 3, 3)).toBe(6.5);
    expect(valueAt(results, 4, 3)).toBe(32);
  });

  it("aplica funciones de agregación, texto y comparaciones", () => {
    const results = evaluateSheetFormulas([
      [10, 20, "texto"],
      ["=SUM(A1:B1)", "=AVERAGE(A1:B1)", "=COUNT(A1:C1)"],
      ["=MIN(A1:B1)", "=MAX(A1:B1)", '=IF(A1<B1, "sí", "no")'],
    ]);

    expect(valueAt(results, 1, 0)).toBe(30);
    expect(valueAt(results, 1, 1)).toBe(15);
    expect(valueAt(results, 1, 2)).toBe(2);
    expect(valueAt(results, 2, 0)).toBe(10);
    expect(valueAt(results, 2, 1)).toBe(20);
    expect(valueAt(results, 2, 2)).toBe("sí");
  });

  it("propaga errores sin lanzar excepciones", () => {
    const results = evaluateSheetFormulas([
      ["=1/0", "=NO_EXISTE(1)", "=A1+1"],
      ["=ZZZ1", "=A1:A20000", "=1+"],
      [true, 0, "=A1"],
    ]);

    expect(errorAt(results, 0, 0)).toBe("#DIV/0!");
    expect(errorAt(results, 0, 1)).toBe("#NOMBRE!");
    expect(errorAt(results, 0, 2)).toBe("#DIV/0!");
    expect(errorAt(results, 1, 0)).toBe("#REF!");
    expect(errorAt(results, 1, 1)).toBe("#VALOR!");
    expect(errorAt(results, 1, 2)).toBe("#VALOR!");
    expect(valueAt(results, 2, 0)).toBe(true);
    expect(valueAt(results, 2, 1)).toBe(0);
  });

  it("detecta referencias circulares", () => {
    const results = evaluateSheetFormulas([
      ["=B1", "=A1"],
      ["=A1+A1", 4],
    ]);

    expect(errorAt(results, 0, 0)).toBe("#CIRC!");
    expect(errorAt(results, 0, 1)).toBe("#CIRC!");
    expect(errorAt(results, 1, 0)).toBe("#CIRC!");
    expect(valueAt(results, 1, 1)).toBe(4);
  });

  it("mantiene texto, números y booleanos sin fórmula", () => {
    const results = evaluateSheetFormulas([["texto", 42, true]]);
    expect(valueAt(results, 0, 0)).toBe("texto");
    expect(valueAt(results, 0, 1)).toBe(42);
    expect(valueAt(results, 0, 2)).toBe(true);
  });

  it("rechaza fórmulas que superan la longitud permitida", () => {
    const formula = `=${"1+".repeat(MAX_FORMULA_LENGTH)}1`;
    expect(errorAt(evaluateSheetFormulas([[formula]]), 0, 0)).toBe("#VALOR!");
  });
});
