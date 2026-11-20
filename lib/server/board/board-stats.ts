import { getD1 } from "../../../db";

/**
 * Medición de los snapshots de pizarra (PER-06, fase 3).
 *
 * El límite de guardado es de 2 MB por snapshot, así que interesa saber
 * cuántas pizarras se acercan y cuánto de su peso son elementos borrados
 * (tumbas) que nadie poda. Las tallas son caracteres, la misma unidad que usa
 * el límite y `snapshot.length`; no son bytes UTF-8.
 */

/** Un mebibyte, unidad de los umbrales. */
const MIB = 1024 * 1024;
/** Pizarras grandes que se inspeccionan para contar elementos y tumbas. */
const LARGEST_LIMIT = 3;

/** Pizarra inspeccionada. */
export type BoardStatsBoard = {
  ownerType: string;
  ownerId: string;
  chars: number;
  /** `null` si el snapshot no se pudo leer. */
  elements: number | null;
  deleted: number | null;
};

/** Resultado de la medición. */
export type BoardStats = {
  boards: number;
  totalChars: number;
  maxChars: number;
  averageChars: number;
  over1mb: number;
  over1_5mb: number;
  largest: BoardStatsBoard[];
};

/**
 * Cuenta elementos y tumbas de un snapshot.
 * @param snapshot - Snapshot serializado.
 * @returns Los recuentos, o `null` si el JSON no es válido.
 */
function countElements(snapshot: string): { elements: number; deleted: number } | null {
  try {
    const parsed = JSON.parse(snapshot) as { elements?: unknown };
    if (!Array.isArray(parsed.elements)) return { elements: 0, deleted: 0 };
    const deleted = parsed.elements.filter((element) => (
      element && typeof element === "object" && (element as { isDeleted?: unknown }).isDeleted === true
    )).length;
    return { elements: parsed.elements.length, deleted };
  } catch {
    return null;
  }
}

/**
 * Agrupa los snapshots por tamaño y revisa las tumbas de los mayores.
 * @returns Los totales y las pizarras más grandes.
 */
export async function boardStats(): Promise<BoardStats> {
  const db = getD1();
  const totals = await db.prepare(`SELECT COUNT(*) AS boards,
      COALESCE(SUM(LENGTH(snapshot)), 0) AS totalChars,
      COALESCE(MAX(LENGTH(snapshot)), 0) AS maxChars,
      SUM(CASE WHEN LENGTH(snapshot) >= ? THEN 1 ELSE 0 END) AS over1mb,
      SUM(CASE WHEN LENGTH(snapshot) >= ? THEN 1 ELSE 0 END) AS over1_5mb
    FROM boards`).bind(MIB, Math.round(1.5 * MIB)).all<{
    boards: number;
    totalChars: number;
    maxChars: number;
    over1mb: number;
    over1_5mb: number;
  }>();
  const row = totals.results[0];
  const boards = Number(row?.boards ?? 0);
  const totalChars = Number(row?.totalChars ?? 0);

  const largestRows = await db.prepare(`SELECT owner_type AS ownerType, owner_id AS ownerId,
      LENGTH(snapshot) AS chars, snapshot
    FROM boards ORDER BY LENGTH(snapshot) DESC LIMIT ?`).bind(LARGEST_LIMIT).all<{
    ownerType: string;
    ownerId: string;
    chars: number;
    snapshot: string;
  }>();
  const largest = largestRows.results.map((board) => {
    const counts = countElements(board.snapshot);
    return {
      ownerType: board.ownerType,
      ownerId: board.ownerId,
      chars: Number(board.chars),
      elements: counts?.elements ?? null,
      deleted: counts?.deleted ?? null,
    };
  });

  return {
    boards,
    totalChars,
    maxChars: Number(row?.maxChars ?? 0),
    averageChars: boards ? Math.round(totalChars / boards) : 0,
    over1mb: Number(row?.over1mb ?? 0),
    over1_5mb: Number(row?.over1_5mb ?? 0),
    largest,
  };
}
