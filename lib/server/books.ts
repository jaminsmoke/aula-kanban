import { env } from "cloudflare:workers";
import { BOOKS, bookById, type BookMeta } from "../books";

/**
 * Servido de libros escolares persistidos (STORE-02). Los PDF viven en
 * R2 con la clave versionada del catálogo (`books/<id>/<versión>.pdf`);
 * la licencia y la atribución viajan con cada ficha para que puedan
 * mostrarse junto al visor.
 */

/** Libro del catálogo con su disponibilidad y URL de archivo. */
export type BookWithAvailability = BookMeta & {
  /** `true` cuando el PDF ya está persistido y se puede servir. */
  available: boolean;
  /** URL interna del archivo con el proyecto, o `null` si no está ingerido. */
  url: string | null;
};

/**
 * Lista el catálogo de libros para la vista Libros, con disponibilidad.
 * @param projectId - Proyecto activo, para la URL del archivo.
 * @returns Las fichas con `available` y `url`.
 */
export function listBooks(projectId: string): BookWithAvailability[] {
  return BOOKS.map((book) => ({
    ...book,
    available: book.storageKey !== null,
    url: book.storageKey ? `/api/books/${book.id}/file?project=${encodeURIComponent(projectId)}` : null,
  }));
}

/** Resultado tipado de intentar leer el PDF de un libro. */
export type BookFileResult =
  | { status: "ok"; book: BookMeta; object: R2ObjectBody }
  | { status: "not_found" | "storage_unavailable" | "object_missing" };

/**
 * Lee el PDF persistido de un libro del catálogo.
 * @param id - Identificador del libro.
 * @returns El objeto, o el motivo concreto por el que no se puede servir.
 */
export async function readBookFile(id: string): Promise<BookFileResult> {
  const book = bookById(id);
  if (!book?.storageKey) return { status: "not_found" };
  if (!env.BUCKET) return { status: "storage_unavailable" };
  const object = await env.BUCKET.get(book.storageKey);
  if (!object) return { status: "object_missing" };
  return { status: "ok", book, object };
}
