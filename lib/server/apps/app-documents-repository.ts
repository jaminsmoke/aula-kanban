import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { appDocuments } from "../../../db/schema";

/**
 * Acceso D1 al estado serializado de los documentos de app.
 *
 * El tamaño máximo, el parseo y el contrato de conflicto viven en
 * `app-documents.ts`; este módulo solo lee, inserta y actualiza filas.
 */

/** Fila de `app_documents`. */
export type AppDocumentRow = typeof appDocuments.$inferSelect;

/** Datos de escritura de un documento. */
export type AppDocumentWrite = {
  projectId: string;
  appId: string;
  state: string;
  updatedByUserId: string | null;
};

/**
 * Busca el documento de una app en un proyecto.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns La fila o `null`.
 */
export async function selectAppDocumentRow(projectId: string, appId: string): Promise<AppDocumentRow | null> {
  const [row] = await getDb()
    .select()
    .from(appDocuments)
    .where(and(eq(appDocuments.projectId, projectId), eq(appDocuments.appId, appId)));
  return row ?? null;
}

/**
 * Guarda o reemplaza el documento sin comprobar la versión.
 * @param input - Proyecto, app, estado serializado y autor.
 * @returns La fecha de actualización aplicada.
 */
export async function upsertAppDocumentRow(input: AppDocumentWrite): Promise<number> {
  const now = Date.now();
  const [saved] = await getDb().insert(appDocuments).values({
    projectId: input.projectId,
    appId: input.appId,
    state: input.state,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
  }).onConflictDoUpdate({
    target: [appDocuments.projectId, appDocuments.appId],
    set: {
      state: input.state,
      updatedAt: sql<number>`max(${now}, ${appDocuments.updatedAt} + 1)`,
      updatedByUserId: input.updatedByUserId,
    },
  }).returning({ updatedAt: appDocuments.updatedAt });
  return saved.updatedAt;
}

/**
 * Inserta el documento solo si no existe una versión previa.
 * @param input - Proyecto, app, estado serializado y autor.
 * @returns La fecha aplicada o `null` si otro cliente lo creó antes.
 */
export async function insertAppDocumentRow(input: AppDocumentWrite): Promise<number | null> {
  const [inserted] = await getDb().insert(appDocuments).values({
    projectId: input.projectId,
    appId: input.appId,
    state: input.state,
    updatedAt: Date.now(),
    updatedByUserId: input.updatedByUserId,
  }).onConflictDoNothing({
    target: [appDocuments.projectId, appDocuments.appId],
  }).returning({ updatedAt: appDocuments.updatedAt });
  return inserted?.updatedAt ?? null;
}

/**
 * Actualiza el documento solo si su versión sigue siendo la esperada.
 * @param input - Proyecto, app, estado, autor y versión esperada.
 * @returns La fecha aplicada o `null` si la versión cambió.
 */
export async function updateAppDocumentRowIfCurrent(
  input: AppDocumentWrite & { expectedUpdatedAt: number },
): Promise<number | null> {
  const now = Date.now();
  const [updated] = await getDb().update(appDocuments).set({
    state: input.state,
    updatedAt: sql<number>`max(${now}, ${appDocuments.updatedAt} + 1)`,
    updatedByUserId: input.updatedByUserId,
  }).where(and(
    eq(appDocuments.projectId, input.projectId),
    eq(appDocuments.appId, input.appId),
    eq(appDocuments.updatedAt, input.expectedUpdatedAt),
  )).returning({ updatedAt: appDocuments.updatedAt });
  return updated?.updatedAt ?? null;
}

/**
 * Lee la versión vigente de un documento.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns La fecha de actualización o `null` si no existe.
 */
export async function selectAppDocumentUpdatedAt(projectId: string, appId: string): Promise<number | null> {
  const [current] = await getDb().select({ updatedAt: appDocuments.updatedAt }).from(appDocuments)
    .where(and(eq(appDocuments.projectId, projectId), eq(appDocuments.appId, appId)));
  return current?.updatedAt ?? null;
}
