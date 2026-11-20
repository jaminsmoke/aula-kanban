import {
  AULA_COPY_MAX_PER_PROJECT,
  AULA_COPY_MAX_ZIP_BYTES,
  AULA_COPY_PROJECT_QUOTA_BYTES,
} from "../../domain/aula-documentos/copy";

/**
 * Reglas puras de las subidas: finalidades, tipos admitidos, límites y cuotas.
 *
 * No tocan D1 ni R2 ni HTTP: reciben tipos y bytes, y devuelven el límite o el
 * mensaje de error. El servicio `storage.ts` aplica estas reglas y el
 * repositorio `storage/repository.ts` persiste.
 */

/** Vía por la que entró el archivo: la web o el servidor MCP. */
export type UploadOrigin = "web" | "mcp";

/** Finalidad declarada de una subida. */
export const uploadPurposes = ["task-image", "board-asset", "document", "document-image", "document-copy"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain", "text/markdown", "text/csv", ...IMAGE_MIME_TYPES];
const COPY_MIME_TYPES = ["application/zip", "application/x-zip-compressed"];
const EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_COPY_BYTES = AULA_COPY_MAX_ZIP_BYTES;
export const MAX_PROJECT_DOCUMENT_COPY_BYTES = AULA_COPY_PROJECT_QUOTA_BYTES;
export const MAX_PROJECT_DOCUMENT_COPIES = AULA_COPY_MAX_PER_PROJECT;
/** Cuota de imágenes de documento por proyecto (50 MB). */
export const MAX_PROJECT_DOCUMENT_IMAGE_BYTES = 50 * 1024 * 1024;

/** La cuota de imágenes de documento del proyecto está llena. */
export class UploadQuotaExceededError extends Error {
  /**
   * Crea el error de cuota de imágenes.
   */
  constructor() {
    super("document_image_quota_exceeded");
    this.name = "UploadQuotaExceededError";
  }
}

/** La cuota de copias portables del proyecto está llena. */
export class DocumentCopyQuotaExceededError extends Error {
  /**
   * Crea el error de cuota de copias.
   */
  constructor() {
    super("document_copy_quota_exceeded");
    this.name = "DocumentCopyQuotaExceededError";
  }
}

/** El proyecto alcanzó el número máximo de copias portables. */
export class DocumentCopyLimitExceededError extends Error {
  /**
   * Crea el error de límite de copias.
   */
  constructor() {
    super("document_copy_limit_exceeded");
    this.name = "DocumentCopyLimitExceededError";
  }
}

/**
 * Extensión con la que se guarda un tipo MIME admitido.
 * @param mimeType - Tipo MIME del fichero.
 * @returns La extensión, o `.bin` si el tipo no está en la tabla.
 */
export function uploadExtension(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? ".bin";
}

/**
 * Comprueba si una imagen cabe en la cuota del proyecto.
 * @param used - Bytes ya usados.
 * @param incoming - Bytes de la imagen nueva.
 * @returns `true` si la subida cabe.
 */
export function fitsDocumentImageQuota(used: number, incoming: number): boolean {
  return used >= 0 && incoming >= 0 && used + incoming <= MAX_PROJECT_DOCUMENT_IMAGE_BYTES;
}

/**
 * Comprueba si una copia cabe en la cuota del proyecto.
 * @param used - Bytes ya usados por copias.
 * @param incoming - Bytes de la copia nueva.
 * @returns `true` si la copia cabe.
 */
export function fitsDocumentCopyQuota(used: number, incoming: number): boolean {
  return used >= 0 && incoming >= 0 && used + incoming <= MAX_PROJECT_DOCUMENT_COPY_BYTES;
}

/**
 * Valida el tipo y el tamaño de un fichero según su finalidad.
 * @param purpose - Finalidad declarada de la subida.
 * @param mimeType - Tipo MIME del fichero.
 * @param sizeBytes - Tamaño en bytes.
 * @returns Mensaje de error para el usuario o `null` cuando es válido.
 */
export function validateUpload(purpose: UploadPurpose, mimeType: string, sizeBytes: number) {
  const allowed = purpose === "document"
    ? DOCUMENT_MIME_TYPES
    : purpose === "document-copy"
      ? COPY_MIME_TYPES
      : IMAGE_MIME_TYPES;
  if (!allowed.includes(mimeType)) return "Tipo de archivo no admitido para esta subida.";
  const max = purpose === "document"
    ? MAX_DOCUMENT_BYTES
    : purpose === "document-copy"
      ? MAX_DOCUMENT_COPY_BYTES
      : MAX_IMAGE_BYTES;
  if (!sizeBytes || sizeBytes > max) {
    if (purpose === "document") return "El documento supera los 10 MB permitidos.";
    if (purpose === "document-copy") return "La copia supera el tamaño máximo permitido.";
    return "La imagen supera los 5 MB permitidos.";
  }
  return null;
}
