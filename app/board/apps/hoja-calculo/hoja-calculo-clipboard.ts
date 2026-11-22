import {
  AULA_DOCUMENT_MAX_TABLE_CELLS,
  AULA_DOCUMENT_MAX_TABLE_COLUMNS,
  AULA_DOCUMENT_MAX_TABLE_ROWS,
} from "../../../../lib/domain/aula-documentos/document-types";
import type { SpreadsheetCell } from "./hoja-calculo-model";

/** Códigos de error del portapapeles de una selección. */
export type SelectionClipboardErrorCode =
  | "empty"
  | "too-many-rows"
  | "too-many-columns"
  | "too-many-cells";

/** Resultado de preparar una selección para el portapapeles. */
export type SelectionClipboardResult =
  | { ok: true; kind: "text"; text: string }
  | { ok: true; kind: "table"; html: string; text: string; rows: number; columns: number }
  | { ok: false; code: SelectionClipboardErrorCode; message: string };

/** Resultado de escribir una selección en el portapapeles. */
export type ClipboardWriteOutcome = "table" | "text" | "text-fallback" | "failed";

/**
 * Convierte el valor de una celda en texto sin perder los valores vacíos.
 * @param value - Valor serializable de la hoja.
 * @returns El texto visible.
 */
function cellText(value: SpreadsheetCell | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Escapa el texto para que pueda viajar dentro de una tabla HTML.
 * @param value - Valor de la celda.
 * @returns El texto escapado y con saltos de línea HTML.
 */
function htmlCell(value: SpreadsheetCell | undefined): string {
  return cellText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n|\r|\n/g, "<br>");
}

/**
 * Normaliza una celda para el respaldo TSV y evita fórmulas ejecutables.
 * @param value - Valor de la celda.
 * @returns El texto sin tabuladores ni saltos de línea internos.
 */
function tsvCell(value: SpreadsheetCell | undefined): string {
  const text = cellText(value).replace(/[\t\r\n]+/g, " ");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/**
 * Prepara una selección de la hoja para copiarla como texto o como tabla.
 *
 * Una sola celda se devuelve como texto. Dos o más celdas se devuelven como
 * HTML para Aula Documentos y TSV como respaldo. La función no muta la matriz
 * recibida ni conoce el portapapeles del navegador.
 * @param cells - Matriz rectangular o irregular con los valores seleccionados.
 * @returns La representación para el portapapeles o un error de límite.
 */
export function buildSelectionClipboard(cells: SpreadsheetCell[][]): SelectionClipboardResult {
  if (cells.length === 0) {
    return { ok: false, code: "empty", message: "Selecciona al menos una celda." };
  }

  const columns = Math.max(...cells.map((row) => row.length), 0);
  if (columns === 0) {
    return { ok: false, code: "empty", message: "Selecciona al menos una celda." };
  }
  if (cells.length > AULA_DOCUMENT_MAX_TABLE_ROWS) {
    return {
      ok: false,
      code: "too-many-rows",
      message: `La selección supera las ${AULA_DOCUMENT_MAX_TABLE_ROWS} filas de una tabla de Aula Documentos.`,
    };
  }
  if (columns > AULA_DOCUMENT_MAX_TABLE_COLUMNS) {
    return {
      ok: false,
      code: "too-many-columns",
      message: `La selección supera las ${AULA_DOCUMENT_MAX_TABLE_COLUMNS} columnas de una tabla de Aula Documentos.`,
    };
  }
  if (cells.length * columns > AULA_DOCUMENT_MAX_TABLE_CELLS) {
    return {
      ok: false,
      code: "too-many-cells",
      message: `La selección supera las ${AULA_DOCUMENT_MAX_TABLE_CELLS} celdas de una tabla de Aula Documentos.`,
    };
  }

  const normalized = cells.map((row) => (
    Array.from({ length: columns }, (_, column) => row[column] ?? "")
  ));

  if (normalized.length === 1 && columns === 1) {
    return { ok: true, kind: "text", text: cellText(normalized[0][0]) };
  }

  const html = `<table><tbody>${normalized.map((row) => (
    `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`
  )).join("")}</tbody></table>`;
  const text = normalized.map((row) => row.map(tsvCell).join("\t")).join("\r\n");

  return {
    ok: true,
    kind: "table",
    html,
    text,
    rows: normalized.length,
    columns,
  };
}

/**
 * Escribe una selección en el portapapeles del navegador.
 *
 * Usa HTML y texto para las tablas. Si el navegador no permite `ClipboardItem`,
 * intenta copiar al menos el TSV y lo informa para que la interfaz no prometa
 * una tabla que no se ha copiado.
 * @param result - Selección preparada o error del adaptador.
 * @returns Cómo se completó la escritura.
 */
export async function writeSelectionClipboard(result: SelectionClipboardResult): Promise<ClipboardWriteOutcome> {
  if (!result.ok) return "failed";
  const clipboard = typeof navigator === "undefined" ? null : navigator.clipboard;
  if (!clipboard) return "failed";

  if (result.kind === "text") {
    if (typeof clipboard.writeText !== "function") return "failed";
    try {
      await clipboard.writeText(result.text);
      return "text";
    } catch {
      return "failed";
    }
  }

  if (typeof ClipboardItem !== "undefined" && typeof clipboard.write === "function") {
    try {
      await clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([result.html], { type: "text/html" }),
          "text/plain": new Blob([result.text], { type: "text/plain" }),
        }),
      ]);
      return "table";
    } catch {
      // Se intenta el respaldo de texto antes de declarar el fallo.
    }
  }

  if (typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(result.text);
      return "text-fallback";
    } catch {
      return "failed";
    }
  }

  return "failed";
}
