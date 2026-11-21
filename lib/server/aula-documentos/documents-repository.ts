import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { aulaDocuments } from "../../../db/schema";

/** Fila de `aula_documents`. */
export type AulaDocumentRow = typeof aulaDocuments.$inferSelect;

/** Datos de escritura de un documento de la suite. */
export type AulaDocumentWrite = {
  projectId: string;
  id: string;
  title: string;
  excerpt: string;
  state: string;
  status: "active" | "archived" | "deleted";
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  createdBy: string | null;
  updatedBy: string | null;
};

/**
 * Busca un documento de la suite por proyecto e id.
 * @param projectId - Proyecto activo.
 * @param id - Identificador del documento.
 * @returns La fila o `null`.
 */
export async function selectAulaDocumentRow(projectId: string, id: string): Promise<AulaDocumentRow | null> {
  const [row] = await getDb()
    .select()
    .from(aulaDocuments)
    .where(and(eq(aulaDocuments.projectId, projectId), eq(aulaDocuments.id, id)));
  return row ?? null;
}

/**
 * Lista los metadatos de los documentos de un proyecto sin cargar el estado.
 * @param projectId - Proyecto activo.
 * @returns Filas resumidas, de la más reciente a la más antigua.
 */
export async function selectAulaDocumentSummaries(projectId: string): Promise<Array<Omit<AulaDocumentRow, "state">>> {
  return getDb()
    .select({
      projectId: aulaDocuments.projectId,
      id: aulaDocuments.id,
      title: aulaDocuments.title,
      excerpt: aulaDocuments.excerpt,
      status: aulaDocuments.status,
      createdAt: aulaDocuments.createdAt,
      updatedAt: aulaDocuments.updatedAt,
      archivedAt: aulaDocuments.archivedAt,
      createdBy: aulaDocuments.createdBy,
      updatedBy: aulaDocuments.updatedBy,
    })
    .from(aulaDocuments)
    .where(eq(aulaDocuments.projectId, projectId))
    .orderBy(desc(aulaDocuments.updatedAt), desc(aulaDocuments.createdAt));
}

/**
 * Inserta un documento solo si su id no existe en el proyecto.
 * @param input - Datos completos del documento.
 * @returns La fila creada o `null` si ya existía.
 */
export async function insertAulaDocumentRow(input: AulaDocumentWrite): Promise<AulaDocumentRow | null> {
  const [row] = await getDb()
    .insert(aulaDocuments)
    .values(input)
    .onConflictDoNothing({ target: [aulaDocuments.projectId, aulaDocuments.id] })
    .returning();
  return row ?? null;
}

/**
 * Actualiza un documento solo si su versión sigue siendo la esperada.
 * @param input - Datos de escritura y versión esperada.
 * @returns La nueva versión o `null` si cambió.
 */
export async function updateAulaDocumentRowIfCurrent(
  input: AulaDocumentWrite & { expectedUpdatedAt: number },
): Promise<number | null> {
  const now = Date.now();
  const [updated] = await getDb()
    .update(aulaDocuments)
    .set({
      title: input.title,
      excerpt: input.excerpt,
      state: input.state,
      status: input.status,
      updatedAt: sql<number>`max(${now}, ${aulaDocuments.updatedAt} + 1)`,
      archivedAt: input.archivedAt,
      updatedBy: input.updatedBy,
    })
    .where(and(
      eq(aulaDocuments.projectId, input.projectId),
      eq(aulaDocuments.id, input.id),
      eq(aulaDocuments.updatedAt, input.expectedUpdatedAt),
    ))
    .returning({ updatedAt: aulaDocuments.updatedAt });
  return updated?.updatedAt ?? null;
}

/**
 * Lee la versión vigente de un documento.
 * @param projectId - Proyecto activo.
 * @param id - Identificador del documento.
 * @returns La versión o `null`.
 */
export async function selectAulaDocumentUpdatedAt(projectId: string, id: string): Promise<number | null> {
  const [row] = await getDb()
    .select({ updatedAt: aulaDocuments.updatedAt })
    .from(aulaDocuments)
    .where(and(eq(aulaDocuments.projectId, projectId), eq(aulaDocuments.id, id)));
  return row?.updatedAt ?? null;
}
