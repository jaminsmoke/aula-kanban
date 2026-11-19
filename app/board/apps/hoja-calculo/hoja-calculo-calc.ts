import { evaluateSheetFormulas, type FormulaErrorCode, type FormulaLimit } from "./hoja-calculo-formula";
import { columnLabel, normalizeSheet, type SpreadsheetCell } from "./hoja-calculo-model";

/** Celda con un error de cálculo. */
export type SheetCalculationError = {
  row: number;
  column: number;
  label: string;
  error: FormulaErrorCode;
  limit?: FormulaLimit;
};

/** Resumen del estado de cálculo de una hoja. */
export type SheetCalculationSummary = {
  formulas: number;
  errors: SheetCalculationError[];
};

/** Resultado completo de calcular una hoja. */
export type SheetCalculation = {
  display: SpreadsheetCell[][];
  summary: SheetCalculationSummary;
};

/**
 * Clave de una celda para el mapa de fórmulas.
 * @param row - Índice de fila cero-based.
 * @param column - Índice de columna cero-based.
 * @returns La clave `fila:columna`.
 */
export function formulaCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

/**
 * Extrae las fórmulas de una matriz de celdas.
 * @param data - Matriz con fórmulas como texto.
 * @returns Un mapa `fila:columna` a fórmula.
 */
export function extractFormulaMap(data: SpreadsheetCell[][]): Map<string, string> {
  const formulas = new Map<string, string>();
  data.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (typeof cell === "string" && cell.trimStart().startsWith("=")) {
      formulas.set(formulaCellKey(rowIndex, columnIndex), cell);
    }
  }));
  return formulas;
}

/**
 * Calcula una hoja y resume sus fórmulas y errores.
 * @param data - Matriz con fórmulas y valores literales.
 * @returns La matriz visible y el resumen del cálculo.
 */
export function calculateSheet(data: SpreadsheetCell[][]): SheetCalculation {
  const results = evaluateSheetFormulas(data);
  let formulas = 0;
  const errors: SheetCalculationError[] = [];
  data.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (typeof cell === "string" && cell.trimStart().startsWith("=")) formulas += 1;
    const result = results[rowIndex]?.[columnIndex];
    if (result && !result.ok) {
      errors.push({
        row: rowIndex,
        column: columnIndex,
        label: `${columnLabel(columnIndex)}${rowIndex + 1}`,
        error: result.error,
        ...(result.limit ? { limit: result.limit } : {}),
      });
    }
  }));
  return {
    display: results.map((row) => row.map((result) => (result.ok ? result.value ?? "" : result.error))),
    summary: { formulas, errors },
  };
}

/**
 * Calcula la matriz que se muestra en la rejilla.
 * @param data - Matriz con fórmulas y valores literales.
 * @returns Valores calculados y códigos de error como texto.
 */
export function computeSheetDisplay(data: SpreadsheetCell[][]): SpreadsheetCell[][] {
  return calculateSheet(data).display;
}

/**
 * Vuelve a colocar las fórmulas originales sobre una matriz de valores.
 * @param display - Matriz visible en la rejilla.
 * @param formulas - Fórmulas indexadas por `fila:columna`.
 * @returns La matriz que se guarda en el documento.
 */
export function buildFormulaSheet(
  display: SpreadsheetCell[][],
  formulas: Map<string, string>,
): SpreadsheetCell[][] {
  const data = normalizeSheet(display);
  for (const [key, formula] of formulas) {
    const [row, column] = key.split(":").map(Number);
    if (!Number.isInteger(row) || !Number.isInteger(column)) continue;
    if (!data[row] || data[row][column] === undefined) continue;
    data[row][column] = formula;
  }
  return data;
}
