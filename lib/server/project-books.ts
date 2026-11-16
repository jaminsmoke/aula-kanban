import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { projectBooks } from "../../db/schema";
import { BOOKS, bookById, type BookMeta } from "../books";

/**
 * Libros habilitados por proyecto (STORE-04): el docente de un proyecto
 * (o un administrador) decide qué libros de `lib/books.ts` son
 * herramienta en la mochila del alumnado y el maletín docente. La
 * ausencia de fila equivale a «no habilitado». El catálogo es código
 * curado; aquí solo vive qué subconjunto toca a cada proyecto.
 */

/** Error tipado para responder con el código HTTP que le corresponde. */
export class ProjectBooksError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Valida el cuerpo de un guardado: ids conocidos del catálogo, sin
 * duplicados. Nunca escribe.
 * @param value - Cuerpo JSON recibido.
 * @returns Los ids validados o el error tipado (400).
 */
export function parseProjectBooks(value: unknown): string[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { bookIds?: unknown }).bookIds)) {
    throw new ProjectBooksError("Falta la lista de libros (`bookIds`).", 400);
  }
  const ids = (value as { bookIds: unknown[] }).bookIds;
  if (ids.length > BOOKS.length || ids.some((id) => typeof id !== "string" || !bookById(id))) {
    throw new ProjectBooksError("La lista contiene libros desconocidos.", 400);
  }
  return [...new Set(ids as string[])];
}

/**
 * Lee los libros de un proyecto con su habilitación.
 * @param projectId - Proyecto activo.
 * @returns El catálogo con `enabled` para cada libro.
 */
export async function listProjectBooks(projectId: string): Promise<(BookMeta & { enabled: boolean })[]> {
  let enabled = new Set<string>();
  try {
    const rows = await getDb().select().from(projectBooks).where(eq(projectBooks.projectId, projectId));
    enabled = new Set(rows.map((row) => row.bookId));
  } catch { /* sin tabla (base antigua) equivale a ninguno habilitado */ }
  return BOOKS.map((book) => ({ ...book, enabled: enabled.has(book.id) }));
}

/**
 * Guarda la lista completa de libros habilitados de un proyecto
 * (sustituye el conjunto anterior).
 * @param projectId - Proyecto activo.
 * @param bookIds - Ids validados del catálogo.
 * @returns La lista guardada.
 */
export async function setProjectBooks(projectId: string, bookIds: string[]): Promise<string[]> {
  const db = getDb();
  const now = Date.now();
  await db.delete(projectBooks).where(eq(projectBooks.projectId, projectId));
  if (bookIds.length) {
    await db.insert(projectBooks).values(bookIds.map((bookId) => ({ projectId, bookId, updatedAt: now })));
  }
  return bookIds;
}

/**
 * Ids de los libros habilitados de un proyecto, solo los del catálogo.
 * @param projectId - Proyecto activo.
 * @returns Los ids habilitados que siguen existiendo en el catálogo.
 */
export async function enabledBookIds(projectId: string): Promise<string[]> {
  return (await listProjectBooks(projectId)).filter((book) => book.enabled).map((book) => book.id);
}

