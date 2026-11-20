/** Tipos MIME admitidos para imágenes locales. */
export const AULA_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

/** Tamaño máximo de una imagen local (5 MB). */
export const AULA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Valor de `accept` para los selectores de archivo. */
export const AULA_IMAGE_ACCEPT = AULA_IMAGE_MIME_TYPES.join(",");

/** Alineaciones permitidas para una imagen del documento. */
export const AULA_IMAGE_ALIGNMENTS = ["left", "center", "right"] as const;

/** Alineación de imagen. */
export type AulaImageAlignment = (typeof AULA_IMAGE_ALIGNMENTS)[number];

/** Atributos normalizados de una imagen. */
export type AulaImageAttrs = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  alignment: AulaImageAlignment;
};

const AULA_IMAGE_SRC = /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Ancho máximo y mínimo como porcentaje de la hoja. */
export const AULA_IMAGE_MIN_WIDTH = 10;
export const AULA_IMAGE_MAX_WIDTH = 100;

/** Límites de texto de una imagen. */
export const AULA_IMAGE_MAX_ALT_LENGTH = 500;
export const AULA_IMAGE_MAX_CAPTION_LENGTH = 1_000;

/**
 * Normaliza la URL de una imagen local.
 * @param value - URL candidata.
 * @returns La ruta interna segura o `null`.
 */
export function normalizeAulaImageSrc(value: unknown): string | null {
  return typeof value === "string" && AULA_IMAGE_SRC.test(value) ? value : null;
}

/**
 * Extrae el id de subida de una URL interna de imagen.
 * @param src - Ruta `/api/files/:id`.
 * @returns El UUID de la subida o `null` si la ruta no es válida.
 */
export function aulaImageUploadId(src: string): string | null {
  return AULA_IMAGE_SRC.exec(src)?.[1] ?? null;
}

/**
 * Normaliza los atributos de una imagen.
 * @param value - Atributos candidatos.
 * @returns Los atributos seguros o un error legible.
 */
export function normalizeAulaImageAttrs(value: unknown):
  | { ok: true; attrs: AulaImageAttrs }
  | { ok: false; message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "La imagen no tiene atributos válidos." };
  }
  const attrs = value as Record<string, unknown>;
  const src = normalizeAulaImageSrc(attrs.src);
  if (!src) {
    return { ok: false, message: "La imagen debe usar un archivo local del proyecto." };
  }

  const alt = typeof attrs.alt === "string" ? attrs.alt.trim() : "";
  if (alt.length > AULA_IMAGE_MAX_ALT_LENGTH) {
    return { ok: false, message: "El texto alternativo de la imagen es demasiado largo." };
  }
  const caption = typeof attrs.caption === "string" ? attrs.caption.trim() : "";
  if (caption.length > AULA_IMAGE_MAX_CAPTION_LENGTH) {
    return { ok: false, message: "El pie de la imagen es demasiado largo." };
  }

  const width = Number.isInteger(attrs.width) && Number(attrs.width) >= AULA_IMAGE_MIN_WIDTH && Number(attrs.width) <= AULA_IMAGE_MAX_WIDTH
    ? Number(attrs.width)
    : AULA_IMAGE_MAX_WIDTH;
  const alignment = typeof attrs.alignment === "string" && (AULA_IMAGE_ALIGNMENTS as readonly string[]).includes(attrs.alignment)
    ? attrs.alignment as AulaImageAlignment
    : "center";

  return {
    ok: true,
    attrs: {
      src,
      alt,
      caption,
      width,
      alignment,
    },
  };
}

/**
 * Recorre un contenido Tiptap y recoge los ids de subida de sus imágenes.
 * @param node - Nodo candidato.
 * @param result - Conjunto acumulado.
 * @returns Los ids únicos encontrados.
 */
export function collectAulaImageUploadIds(node: unknown, result = new Set<string>()): Set<string> {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return result;
  const record = node as { type?: unknown; attrs?: unknown; content?: unknown };
  if (record.type === "aulaImage" && typeof record.attrs === "object" && record.attrs !== null) {
    const src = normalizeAulaImageSrc((record.attrs as Record<string, unknown>).src);
    const id = src ? aulaImageUploadId(src) : null;
    if (id) result.add(id);
  }
  if (Array.isArray(record.content)) {
    for (const child of record.content) collectAulaImageUploadIds(child, result);
  }
  return result;
}
