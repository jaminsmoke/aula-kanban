import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { documentCopies, uploads } from "../../../db/schema";
import { AULA_COPY_FORMAT } from "../../domain/aula-documentos/copy";
import { deleteUpload } from "../storage";

/** Fila de metadatos de una copia portable. */
export type DocumentCopyRow = typeof documentCopies.$inferSelect;

/**
 * Lista las copias portables de un proyecto, de la más reciente a la más antigua.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento opcional para filtrar la lista.
 * @returns Las filas de metadatos.
 */
export async function listDocumentCopies(projectId: string, documentId: string | null = null): Promise<DocumentCopyRow[]> {
  const condition = documentId
    ? and(eq(documentCopies.projectId, projectId), eq(documentCopies.documentId, documentId))
    : eq(documentCopies.projectId, projectId);
  return getDb().select().from(documentCopies)
    .where(condition)
    .orderBy(desc(documentCopies.createdAt));
}

/**
 * Busca una copia por su identificador.
 * @param id - Identificador de la copia (también id de la subida).
 * @returns La fila o `null`.
 */
export async function findDocumentCopy(id: string): Promise<DocumentCopyRow | null> {
  const [row] = await getDb().select().from(documentCopies).where(eq(documentCopies.id, id));
  return row ?? null;
}

/**
 * Registra los metadatos de una copia ya subida a R2.
 * @param input - Proyecto, archivo y datos del manifiesto.
 * @returns La fila creada.
 */
export async function createDocumentCopy(input: {
  id: string;
  projectId: string;
  documentId?: string | null;
  title: string;
  formatVersion: number;
  schemaVersion: number;
  sizeBytes: number;
  ownerUserId: string | null;
  createdAt: number;
}): Promise<DocumentCopyRow> {
  const [row] = await getDb().insert(documentCopies).values({
    id: input.id,
    projectId: input.projectId,
    documentId: input.documentId ?? null,
    title: input.title,
    format: AULA_COPY_FORMAT,
    formatVersion: input.formatVersion,
    schemaVersion: input.schemaVersion,
    sizeBytes: input.sizeBytes,
    ownerUserId: input.ownerUserId,
    createdAt: input.createdAt,
  }).returning();
  return row;
}

/**
 * Borra una copia y su objeto de R2.
 * @param id - Identificador de la copia.
 * @returns `true` si existía.
 */
export async function deleteDocumentCopy(id: string): Promise<boolean> {
  const row = await findDocumentCopy(id);
  if (!row) return false;
  // Primero se libera R2; si falla, conservamos la fila para poder reintentar.
  await deleteUpload(row.id);
  await getDb().delete(documentCopies).where(eq(documentCopies.id, row.id));
  return true;
}

/**
 * Elimina metadatos de copias cuyo objeto ya no existe.
 * @param limit - Máximo de filas a revisar.
 * @returns Número de filas eliminadas.
 */
export async function cleanupOrphanDocumentCopies(limit = 20): Promise<number> {
  const rows = await getDb().select({ id: documentCopies.id })
    .from(documentCopies)
    .leftJoin(uploads, eq(uploads.id, documentCopies.id))
    .where(isNull(uploads.id))
    .limit(limit);
  for (const row of rows) {
    await getDb().delete(documentCopies).where(eq(documentCopies.id, row.id));
  }
  return rows.length;
}
