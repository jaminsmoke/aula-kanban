import { BOOKS, bookById, type BookMeta } from "../../books";
import { getBookObject } from "./books-repository";

/**
 * Servido de libros escolares persistidos (STORE-02). Los PDF viven en
 * R2 con la clave versionada del catálogo (`books/<id>/<versión>.pdf`);
 * la licencia y la atribución viajan con cada ficha para que puedan
 * mostrarse junto al visor. La lectura del objeto vive en
 * `books-repository.ts`.
 */

/** Libro del catálogo con su disponibilidad y URL de archivo. */
export type BookWithAvailability = BookMeta & {
  /** `true` cuando el PDF ya está persistido y se puede servir. */
  available: boolean;
  /** URL interna del archivo con el proyecto, o `null` si no está ingerido. */
  url: string | null;
  /** URL interna de la imagen de portada, o `null` si aún no se extrajo. */
  coverUrl: string | null;
  /** URL interna de la imagen de contraportada, o `null` si aún no se extrajo. */
  backUrl: string | null;
};

/** Kinds of book images served from R2. */
export type BookImageKind = "cover" | "back";

/**
 * Lista el catálogo de libros para la vista Libros, con disponibilidad.
 * @param projectId - Proyecto activo, para la URL del archivo.
 * @returns Las fichas con `available` y `url`.
 */
export function listBooks(projectId: string): BookWithAvailability[] {
  const project = encodeURIComponent(projectId);
  return BOOKS.map((book) => ({
    ...book,
    available: book.storageKey !== null,
    url: book.storageKey ? `/api/books/${book.id}/file?project=${project}` : null,
    coverUrl: book.coverKey ? `/api/books/${book.id}/image?kind=cover&project=${project}` : null,
    backUrl: book.backKey ? `/api/books/${book.id}/image?kind=back&project=${project}` : null,
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
  const result = await getBookObject(book.storageKey);
  return result.status === "ok" ? { status: "ok", book, object: result.object } : result;
}

/** Resultado tipado de intentar leer una imagen de portada. */
export type BookImageResult =
  | { status: "ok"; object: R2ObjectBody }
  | { status: "not_found" | "storage_unavailable" | "object_missing" };

/**
 * Lee la imagen de portada o contraportada de un libro del catálogo.
 * @param id - Identificador del libro.
 * @param kind - Tipo de imagen (`cover` o `back`).
 * @returns El objeto, o el motivo concreto por el que no se puede servir.
 */
export async function readBookImage(id: string, kind: BookImageKind): Promise<BookImageResult> {
  const book = bookById(id);
  const storageKey = kind === "cover" ? book?.coverKey : book?.backKey;
  if (!storageKey) return { status: "not_found" };
  return getBookObject(storageKey);
}
