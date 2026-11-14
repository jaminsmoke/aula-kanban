import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { appDocuments, blocklyPrograms, mermaidDiagrams } from "../../db/schema";

/** Documento guardado de una app en un proyecto. */
export type AppDocument = { state: unknown; updatedAt: number };

/**
 * Lee el documento de una app. Si todavía no existe en `app_documents`,
 * recupera el formato histórico de Blockly o Mermaid para no perder trabajo
 * guardado antes de unificar la persistencia.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns El documento o `null` si nunca se guardó.
 */
export async function readAppDocument(projectId: string, appId: string): Promise<AppDocument | null> {
  const db = getDb();
  const [row] = await db.select().from(appDocuments)
    .where(and(eq(appDocuments.projectId, projectId), eq(appDocuments.appId, appId)));
  if (row) return { state: JSON.parse(row.state) as unknown, updatedAt: row.updatedAt };

  if (appId === "blockly") {
    const [legacy] = await db.select().from(blocklyPrograms).where(eq(blocklyPrograms.projectId, projectId));
    if (legacy) return { state: JSON.parse(legacy.state) as unknown, updatedAt: legacy.updatedAt };
  }
  if (appId === "mermaid") {
    const [legacy] = await db.select().from(mermaidDiagrams).where(eq(mermaidDiagrams.projectId, projectId));
    if (legacy) return { state: { code: legacy.code }, updatedAt: legacy.updatedAt };
  }
  return null;
}

/**
 * Guarda (o reemplaza) el documento de una app para el proyecto.
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
  await getDb().insert(appDocuments).values({
    projectId: input.projectId,
    appId: input.appId,
    state: input.state,
    updatedAt: now,
    updatedByUserId: input.updatedByUserId,
  }).onConflictDoUpdate({
    target: [appDocuments.projectId, appDocuments.appId],
    set: { state: input.state, updatedAt: now, updatedByUserId: input.updatedByUserId },
  });
  return now;
}
