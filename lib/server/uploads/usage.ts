import { getD1 } from "../../../db";
import { idsDeArchivo, referenciasDeDocumento } from "../../domain/uploads/references";

/**
 * Inventario de archivos sin uso de un proyecto (PER-03, fase 1).
 *
 * Reúne las referencias `/api/files/{id}` de tareas, pizarras y documentos de
 * app, y devuelve las filas de `uploads` que ya nadie referencia y superan el
 * periodo de gracia. No borra nada: la simulación y la purga llegan en la
 * fase 2. Un documento ilegible falla cerrado y bloquea los candidatos de su
 * proyecto.
 */

/** Días que se conserva un archivo sin referencia antes de poder purgarlo. */
export const UPLOAD_GRACE_DAYS = 7;
/** Periodo de gracia en milisegundos. */
export const UPLOAD_GRACE_MS = UPLOAD_GRACE_DAYS * 24 * 60 * 60 * 1000;
/** Candidatos que devuelve una ejecución por defecto. */
export const UPLOAD_BATCH_LIMIT = 100;
/** Tope duro de candidatos por ejecución. */
export const UPLOAD_BATCH_LIMIT_MAX = 500;
/** Filas que se examinan como máximo en una pasada. */
const UPLOAD_SCAN_LIMIT = 1000;

/** Fila de `uploads` candidata a purga. */
export type UploadCandidate = {
  id: string;
  url: string;
  storageKey: string;
  purpose: string;
  sizeBytes: number;
  createdAt: number;
};

/** Resultado del inventario: candidatos o motivo para no purgar. */
export type UnusedUploadsReport =
  | { ok: true; projectId: string; references: number; candidates: UploadCandidate[]; hasMore: boolean }
  | { ok: false; projectId: string; reason: "references_unreadable" };

type FileRow = { imageUrl: string | null };
type SnapshotRow = { snapshot: string | null };
type DocumentRow = { state: string | null };

/**
 * Ajusta el tope pedido a un rango seguro.
 * @param limit - Tope recibido o `undefined`.
 * @returns Un entero entre 1 y `UPLOAD_BATCH_LIMIT_MAX`.
 */
function batchLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit) || !limit) return UPLOAD_BATCH_LIMIT;
  return Math.min(Math.max(limit, 1), UPLOAD_BATCH_LIMIT_MAX);
}

/**
 * Reúne las referencias de todos los documentos del proyecto.
 * @param projectId - Proyecto activo.
 * @returns El conjunto de identificadores referenciados, o `null` si un documento está corrupto.
 */
export async function projectFileReferences(projectId: string): Promise<Set<string> | null> {
  const db = getD1();
  const [tasks, boards, documents] = await Promise.all([
    db.prepare("SELECT image_url AS imageUrl FROM tasks WHERE project_id = ? AND image_url IS NOT NULL AND image_url <> ''")
      .bind(projectId).all<FileRow>(),
    db.prepare("SELECT snapshot FROM boards WHERE project_id = ?").bind(projectId).all<SnapshotRow>(),
    db.prepare("SELECT state FROM app_documents WHERE project_id = ?").bind(projectId).all<DocumentRow>(),
  ]);

  const references = new Set<string>();
  for (const row of tasks.results) {
    for (const id of idsDeArchivo(row.imageUrl ?? "")) references.add(id);
  }
  for (const row of boards.results) {
    const ids = referenciasDeDocumento(row.snapshot ?? "");
    if (ids === null) return null;
    for (const id of ids) references.add(id);
  }
  for (const row of documents.results) {
    const ids = referenciasDeDocumento(row.state ?? "");
    if (ids === null) return null;
    for (const id of ids) references.add(id);
  }
  return references;
}

/**
 * Lista los archivos del proyecto sin referencia y fuera del periodo de gracia.
 * @param input - Proyecto, reloj y tope de la simulación.
 * @returns Los candidatos acotados, cuántas referencias se encontraron y si quedan más.
 */
export async function findUnusedUploads(input: {
  projectId: string;
  now?: number;
  graceMs?: number;
  limit?: number;
}): Promise<UnusedUploadsReport> {
  const references = await projectFileReferences(input.projectId);
  if (references === null) return { ok: false, projectId: input.projectId, reason: "references_unreadable" };

  const now = input.now ?? Date.now();
  const cutoff = now - (input.graceMs ?? UPLOAD_GRACE_MS);
  const limit = batchLimit(input.limit);
  const rows = await getD1()
    .prepare(`SELECT id, url, storage_key AS storageKey, purpose, size_bytes AS sizeBytes, created_at AS createdAt
      FROM uploads WHERE project_id = ? AND created_at < ? ORDER BY created_at ASC LIMIT ?`)
    .bind(input.projectId, cutoff, UPLOAD_SCAN_LIMIT)
    .all<UploadCandidate>();

  const unused = rows.results.filter((row) => !references.has(row.id));
  return {
    ok: true,
    projectId: input.projectId,
    references: references.size,
    candidates: unused.slice(0, limit),
    hasMore: unused.length > limit || rows.results.length === UPLOAD_SCAN_LIMIT,
  };
}
