import { getD1 } from "../../../db";

/**
 * Medición de las subidas por origen y tamaño (PER-08).
 *
 * Separa lo que llega por la web, que ya se reduce en el navegador, de lo que
 * llega por MCP, que hoy guarda el original. Sirve para decidir con datos si
 * hace falta un redimensionador en el Worker. Las filas anteriores a la
 * columna `origin` se agrupan como `unknown`; no se adivina su procedencia.
 */

/** Un mebibyte, unidad de los umbrales. */
const MIB = 1024 * 1024;

/** Origen de una subida; `unknown` para las filas anteriores a la medición. */
export type UploadStatsOrigin = "web" | "mcp" | "unknown";

/** Agregado por origen y finalidad. */
export type UploadStatsRow = {
  origin: UploadStatsOrigin;
  purpose: string;
  count: number;
  bytes: number;
  maxBytes: number;
  /** Subidas de 1 MB o más. */
  over1mb: number;
  /** Subidas de 2 MB o más. */
  over2mb: number;
};

/** Resultado de la medición. */
export type UploadStats = {
  total: number;
  rows: UploadStatsRow[];
};

/**
 * Agrupa todas las subidas por origen, finalidad y tamaño.
 * @returns Los agregados ordenados por origen y finalidad.
 */
export async function uploadStats(): Promise<UploadStats> {
  const result = await getD1().prepare(`SELECT COALESCE(origin, 'unknown') AS origin, purpose,
      COUNT(*) AS count, SUM(size_bytes) AS bytes, MAX(size_bytes) AS maxBytes,
      SUM(CASE WHEN size_bytes >= ? THEN 1 ELSE 0 END) AS over1mb,
      SUM(CASE WHEN size_bytes >= ? THEN 1 ELSE 0 END) AS over2mb
    FROM uploads GROUP BY COALESCE(origin, 'unknown'), purpose ORDER BY origin, purpose`)
    .bind(MIB, 2 * MIB)
    .all<UploadStatsRow>();
  const rows = result.results.map((row) => ({
    origin: row.origin,
    purpose: row.purpose,
    count: Number(row.count),
    bytes: Number(row.bytes),
    maxBytes: Number(row.maxBytes),
    over1mb: Number(row.over1mb),
    over2mb: Number(row.over2mb),
  }));
  return { total: rows.reduce((sum, row) => sum + row.count, 0), rows };
}
