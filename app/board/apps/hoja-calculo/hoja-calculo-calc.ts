import { evaluateSheetFormulas } from "./hoja-calculo-formula";
import { normalizeSheet, type SpreadsheetCell } from "./hoja-calculo-model";

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
 * Calcula la matriz que se muestra en la rejilla.
 * @param data - Matriz con fórmulas y valores literales.
 * @returns Valores calculados y códigos de error como texto.
 */
export function computeSheetDisplay(data: SpreadsheetCell[][]): SpreadsheetCell[][] {
  return evaluateSheetFormulas(data).map((row) => row.map((result) => (
    result.ok ? result.value ?? "" : result.error
  )));
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
