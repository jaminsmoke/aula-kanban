import { env } from "cloudflare:workers";
import { getD1 } from "../../../db";
import { StorageUnavailableError } from "../storage/repository";
import { findUnusedUploads, projectFileReferences } from "./usage";

/**
 * Purga de archivos sin uso (PER-03, fase 2).
 *
 * Trabaja sobre los candidatos del inventario, vuelve a leer las referencias
 * antes de cada borrado y elimina primero el objeto de R2 y después la fila.
 * Un fallo individual no detiene el lote: la fila se conserva para reintentar.
 * La simulación no toca R2 ni D1.
 */

/** Resultado de purgar un proyecto. */
export type PurgeReport =
  | {
    ok: true;
    projectId: string;
    simulated: boolean;
    candidates: number;
    deleted: number;
    skipped: number;
    failed: number;
    bytes: number;
    hasMore: boolean;
    /** Un documento dejó de ser legible durante el lote y se detuvo la purga. */
    aborted: boolean;
  }
  | { ok: false; projectId: string; reason: "references_unreadable" };

/** Resultado de purgar todos los proyectos con archivos. */
export type PurgeRunReport = {
  simulated: boolean;
  projects: number;
  candidates: number;
  deleted: number;
  skipped: number;
  failed: number;
  bytes: number;
  hasMore: boolean;
  problems: Array<{ projectId: string; reason: "references_unreadable" }>;
};

/**
 * Purga los archivos sin uso de un proyecto.
 * @param input - Proyecto, reloj, tope y si solo se simula.
 * @returns Los recuentos del lote; no lanza por un archivo concreto.
 */
export async function purgeUnusedUploads(input: {
  projectId: string;
  now?: number;
  limit?: number;
  simulate?: boolean;
}): Promise<PurgeReport> {
  const inventory = await findUnusedUploads(input);
  if (!inventory.ok) return inventory;

  const simulated = input.simulate ?? true;
  if (simulated) {
    return {
      ok: true,
      projectId: input.projectId,
      simulated,
      candidates: inventory.candidates.length,
      deleted: 0,
      skipped: 0,
      failed: 0,
      bytes: inventory.candidates.reduce((total, candidate) => total + candidate.sizeBytes, 0),
      hasMore: inventory.hasMore,
      aborted: false,
    };
  }

  if (!env.BUCKET) throw new StorageUnavailableError();

  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;
  let aborted = false;
  for (const candidate of inventory.candidates) {
    // Relectura justo antes de borrar: un guardado reciente protege el archivo.
    const references = await projectFileReferences(input.projectId);
    if (references === null) {
      aborted = true;
      break;
    }
    if (references.has(candidate.id)) {
      skipped += 1;
      continue;
    }
    try {
      await env.BUCKET.delete(candidate.storageKey);
      await getD1().prepare("DELETE FROM uploads WHERE id = ? AND project_id = ?")
        .bind(candidate.id, input.projectId)
        .run();
      deleted += 1;
      bytes += candidate.sizeBytes;
    } catch {
      // La fila se conserva hasta que el objeto se pueda borrar.
      failed += 1;
    }
  }

  return {
    ok: true,
    projectId: input.projectId,
    simulated,
    candidates: inventory.candidates.length,
    deleted,
    skipped,
    failed,
    bytes,
    hasMore: inventory.hasMore,
    aborted,
  };
}

/**
 * Purga todos los proyectos con archivos registrados.
 * @param input - Reloj, tope y si solo se simula.
 * @returns La suma de los lotes y los proyectos que no se pudieron revisar.
 */
export async function purgeAllUnusedUploads(input: {
  now?: number;
  limit?: number;
  simulate?: boolean;
}): Promise<PurgeRunReport> {
  const rows = await getD1()
    .prepare("SELECT DISTINCT project_id AS projectId FROM uploads ORDER BY project_id ASC")
    .all<{ projectId: string }>();

  const run: PurgeRunReport = {
    simulated: input.simulate ?? true,
    projects: 0,
    candidates: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
    bytes: 0,
    hasMore: false,
    problems: [],
  };

  for (const row of rows.results) {
    const report = await purgeUnusedUploads({ ...input, projectId: row.projectId });
    if (!report.ok) {
      run.problems.push({ projectId: report.projectId, reason: report.reason });
      continue;
    }
    run.projects += 1;
    run.candidates += report.candidates;
    run.deleted += report.deleted;
    run.skipped += report.skipped;
    run.failed += report.failed;
    run.bytes += report.bytes;
    run.hasMore = run.hasMore || report.hasMore;
    if (report.aborted) run.problems.push({ projectId: report.projectId, reason: "references_unreadable" });
  }
  return run;
}
