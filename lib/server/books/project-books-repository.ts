import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectBooks } from "../../../db/schema";

/**
 * Acceso D1 a los libros habilitados por proyecto.
 *
 * La validación del cuerpo y el catálogo viven en `project-books.ts`; este
 * módulo solo lee y sustituye las filas de `project_books`.
 */

/** Fila de `project_books`. */
export type ProjectBookRow = typeof projectBooks.$inferSelect;

/**
 * Lista los libros habilitados de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns Las filas de `project_books`.
 */
export async function listProjectBookRows(projectId: string): Promise<ProjectBookRow[]> {
  return getDb().select().from(projectBooks).where(eq(projectBooks.projectId, projectId));
}

/**
 * Sustituye la selección completa de libros de un proyecto.
 * @param projectId - Proyecto activo.
 * @param bookIds - Ids validados del catálogo.
 */
export async function replaceProjectBookRows(projectId: string, bookIds: readonly string[]): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.delete(projectBooks).where(eq(projectBooks.projectId, projectId));
  if (bookIds.length) {
    await db.insert(projectBooks).values(bookIds.map((bookId) => ({ projectId, bookId, updatedAt: now })));
  }
}
