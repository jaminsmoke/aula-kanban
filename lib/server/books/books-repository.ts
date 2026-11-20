import { env } from "cloudflare:workers";

/**
 * Acceso R2 a los PDF y portadas del catálogo de libros.
 *
 * El catálogo curado y el motivo de cada fallo viven en `books.ts`; este
 * módulo solo resuelve el binding y la lectura del objeto.
 */

/** Resultado de leer un objeto de R2 del catálogo. */
export type BookObjectResult =
  | { status: "ok"; object: R2ObjectBody }
  | { status: "storage_unavailable" | "object_missing" };

/**
 * Lee un objeto del bucket por su clave.
 * @param key - Clave versionada del PDF o de la imagen.
 * @returns El objeto o el motivo por el que no se puede servir.
 */
export async function getBookObject(key: string): Promise<BookObjectResult> {
  if (!env.BUCKET) return { status: "storage_unavailable" };
  const object = await env.BUCKET.get(key);
  if (!object) return { status: "object_missing" };
  return { status: "ok", object };
}
