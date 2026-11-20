import type { JSONContent } from "@tiptap/core";
import {
  AULA_DOCUMENT_MAX_TABLE_COLUMNS,
  AULA_DOCUMENT_MAX_TABLE_ROWS,
  AULA_TABLE_MAX_SPAN,
  DocumentValidationError,
} from "./document-types";

/**
 * Normaliza un span de tabla.
 * @param value - Valor candidato.
 * @param label - Nombre del atributo para el mensaje.
 * @returns El span válido.
 */
export function normalizeTableSpan(value: unknown, label: string): number {
  if (value === undefined || value === null) return 1;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > AULA_TABLE_MAX_SPAN) {
    throw new DocumentValidationError(
      "invalid-table",
      `La tabla tiene un ${label} no válido. El máximo es ${AULA_TABLE_MAX_SPAN}.`,
    );
  }
  return Number(value);
}

/**
 * Comprueba que una tabla forma una cuadrícula segura.
 * @param rows - Filas normalizadas.
 * @returns El número de columnas.
 */
export function validateTableGrid(rows: JSONContent[]): number {
  if (!rows.length) {
    throw new DocumentValidationError("invalid-table", "La tabla no tiene filas.");
  }
  if (rows.length > AULA_DOCUMENT_MAX_TABLE_ROWS) {
    throw new DocumentValidationError(
      "table-too-large",
      `Una tabla supera el límite de ${AULA_DOCUMENT_MAX_TABLE_ROWS} filas.`,
    );
  }

  const occupied = rows.map(() => new Set<number>());
  let columns = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex].content ?? [];
    if (!cells.length) {
      throw new DocumentValidationError("invalid-table", "Una fila de la tabla está vacía.");
    }
    let column = 0;
    for (const cell of cells) {
      while (occupied[rowIndex].has(column)) column += 1;
      const attrs = (cell.attrs ?? {}) as { colspan?: number; rowspan?: number };
      const colspan = attrs.colspan ?? 1;
      const rowspan = attrs.rowspan ?? 1;
      if (column + colspan > AULA_DOCUMENT_MAX_TABLE_COLUMNS) {
        throw new DocumentValidationError(
          "table-too-large",
          `Una tabla supera el límite de ${AULA_DOCUMENT_MAX_TABLE_COLUMNS} columnas.`,
        );
      }
      if (rowIndex + rowspan > rows.length) {
        throw new DocumentValidationError("invalid-table", "Una celda combinada sobresale de la tabla.");
      }
      for (let row = rowIndex; row < rowIndex + rowspan; row += 1) {
        for (let col = column; col < column + colspan; col += 1) {
          if (occupied[row].has(col)) {
            throw new DocumentValidationError("invalid-table", "La tabla tiene celdas combinadas superpuestas.");
          }
          occupied[row].add(col);
        }
      }
      column += colspan;
      columns = Math.max(columns, column);
    }
  }

  for (const row of occupied) {
    for (let col = 0; col < columns; col += 1) {
      if (!row.has(col)) {
        throw new DocumentValidationError("invalid-table", "La tabla tiene huecos entre celdas.");
      }
    }
  }
  return columns;
}
