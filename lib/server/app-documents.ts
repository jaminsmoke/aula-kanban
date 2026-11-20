import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { appDocuments } from "../../db/schema";

/** Límite del estado serializado de un documento de app (200 KB). */
export const MAX_APP_DOCUMENT_CHARS = 200_000;

/** Documento guardado de una app en un proyecto. */
export type AppDocument = { state: unknown; updatedAt: number };

/**
 * Lee el documento de una app en la tabla común.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns El documento o `null` si nunca se guardó.
 */
export async function readAppDocument(projectId: string, appId: string): Promise<AppDocument | null> {
  const db = getDb();
  const [row] = await db.select().from(appDocuments)
    .where(and(eq(appDocuments.projectId, projectId), eq(appDocuments.appId, appId)));
  return row ? { state: JSON.parse(row.state) as unknown, updatedAt: row.updatedAt } : null;
}

/**
 * Guarda (o reemplaza) el documento de una app para el proyecto sin comprobar
 * la versión. Se conserva para los clientes anteriores y las herramientas MCP;
 * la web usa `saveAppDocumentIfCurrent`.
 * @param input - Proyecto, app, estado ya serializado y autor.
 * @returns La fecha de actualización aplicada.
 */
export async function saveAppDocument(input: {
  projectId: string;
  appId: string;
  state: string;
  updatedByUserId: string | null;
}): Promise<number> {
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

/** Resultado de un guardado condicionado a la versión conocida por el cliente. */
export type SaveAppDocumentResult =
  | { status: "saved"; updatedAt: number }
  | { status: "conflict"; updatedAt: number | null };

/**
 * Guarda el documento solo si la versión del servidor sigue siendo la esperada.
 * La comprobación y la escritura se hacen en una sola sentencia para que dos
 * guardados simultáneos no puedan aceptarse ambos.
 * @param input - Proyecto, app, estado serializado, autor y versión esperada.
 * @returns El resultado del guardado y la versión vigente.
 */
export async function saveAppDocumentIfCurrent(input: {
  projectId: string;
  appId: string;
  state: string;
  updatedByUserId: string | null;
  expectedUpdatedAt: number | null;
}): Promise<SaveAppDocumentResult> {
  const db = getDb();
  const now = Date.now();

  if (input.expectedUpdatedAt === null) {
    const [inserted] = await db.insert(appDocuments).values({
      projectId: input.projectId,
      appId: input.appId,
      state: input.state,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId,
    }).onConflictDoNothing({
      target: [appDocuments.projectId, appDocuments.appId],
    }).returning({ updatedAt: appDocuments.updatedAt });
    if (inserted) return { status: "saved", updatedAt: inserted.updatedAt };
  } else {
    const [updated] = await db.update(appDocuments).set({
      state: input.state,
      updatedAt: sql<number>`max(${now}, ${appDocuments.updatedAt} + 1)`,
      updatedByUserId: input.updatedByUserId,
    }).where(and(
      eq(appDocuments.projectId, input.projectId),
      eq(appDocuments.appId, input.appId),
      eq(appDocuments.updatedAt, input.expectedUpdatedAt),
    )).returning({ updatedAt: appDocuments.updatedAt });
    if (updated) return { status: "saved", updatedAt: updated.updatedAt };
  }

  const [current] = await db.select({ updatedAt: appDocuments.updatedAt }).from(appDocuments)
    .where(and(eq(appDocuments.projectId, input.projectId), eq(appDocuments.appId, input.appId)));
  return { status: "conflict", updatedAt: current?.updatedAt ?? null };
}
