/** Valor admitido por una celda. */
export type SpreadsheetCell = string | number | boolean;

/** Documento serializable de una hoja de cálculo. */
export type SpreadsheetDocument = {
  data: SpreadsheetCell[][];
};

/** Filas y columnas de la hoja inicial. */
export const SHEET_ROWS = 20;
export const SHEET_COLUMNS = 6;

/** Hoja de ejemplo con un presupuesto sencillo y fórmulas. */
export const STARTER_SHEET: SpreadsheetCell[][] = [
  ["Presupuesto del proyecto", "", "", "", "", ""],
  ["Concepto", "Cantidad", "Precio", "Total", "", ""],
  ["Materiales", 3, 4.5, "=B3*C3", "", ""],
  ["Impresión", 1, 12, "=B4*C4", "", ""],
  ["Transporte", 2, 3.25, "=B5*C5", "", ""],
  ["Total", "", "", "=SUM(D3:D5)", "", ""],
  ...Array.from({ length: SHEET_ROWS - 6 }, () => Array.from({ length: SHEET_COLUMNS }, () => "")),
];

/** Cabeceras de la hoja inicial. */
export const SHEET_HEADERS = ["Concepto", "Cantidad", "Precio", "Total", "", ""];

/**
 * Crea una hoja vacía con las dimensiones indicadas.
 * @param rows - Número de filas.
 * @param columns - Número de columnas.
 * @returns La matriz de celdas vacías.
 */
export function createEmptySheet(rows = SHEET_ROWS, columns = SHEET_COLUMNS): SpreadsheetCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ""));
}

/**
 * Copia una hoja y garantiza un tamaño mínimo de filas y columnas.
 * @param data - Datos de origen.
 * @param rows - Filas mínimas.
 * @param columns - Columnas mínimas.
 * @returns Una copia normalizada.
 */
export function normalizeSheet(
  data: SpreadsheetCell[][],
  rows = SHEET_ROWS,
  columns = SHEET_COLUMNS,
): SpreadsheetCell[][] {
  const width = Math.max(columns, ...data.map((row) => row.length), 0);
  return Array.from({ length: Math.max(rows, data.length) }, (_, rowIndex) => (
    Array.from({ length: width }, (_, columnIndex) => data[rowIndex]?.[columnIndex] ?? "")
  ));
}

/**
 * Convierte un índice de columna en su letra.
 * @param index - Índice cero-based.
 * @returns Letra de columna (`A`, `B`, ...).
 */
export function columnLabel(index: number): string {
  let value = Math.max(0, index) + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

/**
 * Convierte una selección de coordenadas en un rango A1.
 * @param selection - Coordenadas `[x1, y1, x2, y2]`.
 * @returns El rango listo para jspreadsheet.
 */
export function selectionToRange(selection: [number, number, number, number]): string {
  const [x1, y1, x2, y2] = selection;
  const start = `${columnLabel(Math.min(x1, x2))}${Math.min(y1, y2) + 1}`;
  const end = `${columnLabel(Math.max(x1, x2))}${Math.max(y1, y2) + 1}`;
  return start === end ? start : `${start}:${end}`;
}

/**
 * Escapa un valor para un CSV seguro.
 * @param value - Valor de la celda.
 * @returns El valor listo para CSV.
 */
export function csvCell(value: SpreadsheetCell): string {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Convierte la hoja en CSV.
 * @param data - Matriz de celdas.
 * @returns El CSV con una fila por línea.
 */
export function toCsv(data: SpreadsheetCell[][]): string {
  return data.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/**
 * Valida un documento leído de `app_documents`.
 * @param value - Valor candidato.
 * @returns El documento o `null` si no es válido.
 */
export function parseSpreadsheetDocument(value: unknown): SpreadsheetDocument | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.data) || candidate.data.length === 0) return null;
  if (candidate.data.length > 200) return null;

  const data: SpreadsheetCell[][] = [];
  for (const row of candidate.data) {
    if (!Array.isArray(row) || row.length > 50) return null;
    const normalizedRow: SpreadsheetCell[] = [];
    for (const cell of row) {
      if (typeof cell !== "string" && typeof cell !== "number" && typeof cell !== "boolean") return null;
      normalizedRow.push(cell);
    }
    data.push(normalizedRow);
  }
  return { data: normalizeSheet(data) };
}
