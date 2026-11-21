import { and, count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { aulaDocumentComments } from "../../../db/schema";

/** Fila de `aula_document_comments`. */
export type AulaDocumentCommentRow = typeof aulaDocumentComments.$inferSelect;

/** Datos de escritura de un comentario. */
export type AulaDocumentCommentWrite = {
  id: string;
  projectId: string;
  documentId: string;
  parentId: string | null;
  authorUserId: string | null;
  authorName: string;
  body: string;
  anchor: string;
  status: "open" | "resolved" | "deleted";
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
};

/**
 * Lista los comentarios de un documento en orden de creación.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento.
 * @returns Filas de comentarios.
 */
export async function selectAulaCommentRows(projectId: string, documentId: string): Promise<AulaDocumentCommentRow[]> {
  return getDb()
    .select()
    .from(aulaDocumentComments)
    .where(and(eq(aulaDocumentComments.projectId, projectId), eq(aulaDocumentComments.documentId, documentId)))
    .orderBy(aulaDocumentComments.createdAt, aulaDocumentComments.id);
}

/**
 * Busca un comentario concreto.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @param commentId - Comentario.
 * @returns Fila o `null`.
 */
export async function selectAulaCommentRow(projectId: string, documentId: string, commentId: string): Promise<AulaDocumentCommentRow | null> {
  const [row] = await getDb()
    .select()
    .from(aulaDocumentComments)
    .where(and(
      eq(aulaDocumentComments.projectId, projectId),
      eq(aulaDocumentComments.documentId, documentId),
      eq(aulaDocumentComments.id, commentId),
    ));
  return row ?? null;
}

/**
 * Cuenta todos los comentarios de un documento, incluidos los borrados.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @returns Número de filas.
 */
export async function countAulaCommentRows(projectId: string, documentId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(aulaDocumentComments)
    .where(and(eq(aulaDocumentComments.projectId, projectId), eq(aulaDocumentComments.documentId, documentId)));
  return row?.value ?? 0;
}

/**
 * Inserta un comentario nuevo.
 * @param input - Datos completos.
 * @returns La fila creada.
 */
export async function insertAulaCommentRow(input: AulaDocumentCommentWrite): Promise<AulaDocumentCommentRow> {
  const [row] = await getDb().insert(aulaDocumentComments).values(input).returning();
  return row;
}

/**
 * Actualiza un comentario si su versión sigue siendo la esperada.
 * @param input - Cambios y versión esperada.
 * @returns La fila actualizada o `null` si cambió.
 */
export async function updateAulaCommentRowIfCurrent(input: {
  projectId: string;
  documentId: string;
  id: string;
  expectedUpdatedAt: number;
  body: string;
  status: "open" | "resolved" | "deleted";
  resolvedAt: number | null;
  resolvedBy: string | null;
}): Promise<AulaDocumentCommentRow | null> {
  const now = Date.now();
  const [row] = await getDb()
    .update(aulaDocumentComments)
    .set({
      body: input.body,
      status: input.status,
      resolvedAt: input.resolvedAt,
      resolvedBy: input.resolvedBy,
      updatedAt: Math.max(now, input.expectedUpdatedAt + 1),
    })
    .where(and(
      eq(aulaDocumentComments.projectId, input.projectId),
      eq(aulaDocumentComments.documentId, input.documentId),
      eq(aulaDocumentComments.id, input.id),
      eq(aulaDocumentComments.updatedAt, input.expectedUpdatedAt),
    ))
    .returning();
  return row ?? null;
}
