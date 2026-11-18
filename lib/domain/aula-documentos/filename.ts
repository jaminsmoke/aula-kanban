/** Longitud máxima del slug de un archivo. */
const MAX_SLUG_LENGTH = 72;

/**
 * Convierte un título en un slug estable para nombres de archivo.
 * @param title - Título del documento.
 * @param fallback - Nombre usado si el título no deja caracteres útiles.
 * @returns Slug en minúsculas, con guiones y sin acentos.
 */
export function aulaFileSlug(title: string, fallback = "documento"): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return normalized || fallback;
}

/**
 * Construye el nombre de un archivo exportado a partir del título.
 * @param title - Título del documento.
 * @param extension - Extensión sin punto.
 * @param fallback - Nombre usado si el título no deja caracteres útiles.
 * @returns Nombre de archivo con la extensión indicada.
 */
export function aulaFileName(title: string, extension: string, fallback = "documento"): string {
  return `${aulaFileSlug(title, fallback)}.${extension.replace(/^\./, "")}`;
}

/**
 * Construye el nombre del JSON de recuperación de un documento inválido.
 * @param title - Título conocido o `null`.
 * @returns Nombre de archivo terminado en `-recuperacion.json`.
 */
export function aulaRecoveryFileName(title: string | null = null): string {
  return `${aulaFileSlug(title ?? "", "documento")}-recuperacion.json`;
}
