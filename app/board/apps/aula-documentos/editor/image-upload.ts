import {
  AULA_IMAGE_MAX_BYTES,
  AULA_IMAGE_MIME_TYPES,
} from "../../../../../lib/domain/aula-documentos/image";

/** Resultado de subir una imagen de documento. */
export type AulaImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Comprueba que un archivo pueda usarse como imagen del documento.
 * @param file - Archivo elegido o pegado.
 * @returns Un mensaje de error o `null`.
 */
export function validateAulaImageFile(file: File): string | null {
  if (!(AULA_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Solo se admiten imágenes PNG, JPEG, WebP o GIF.";
  }
  if (!file.size || file.size > AULA_IMAGE_MAX_BYTES) {
    return "La imagen supera los 5 MB permitidos.";
  }
  return null;
}

/**
 * Sube una imagen local al almacenamiento privado del proyecto.
 * @param projectId - Proyecto activo.
 * @param file - Imagen local.
 * @returns La URL interna o un error legible.
 */
export async function uploadAulaImage(projectId: string, file: File): Promise<AulaImageUploadResult> {
  const problem = validateAulaImageFile(file);
  if (problem) return { ok: false, message: problem };

  const body = new FormData();
  body.append("file", file);
  body.append("purpose", "document-image");
  try {
    const response = await fetch(`/api/uploads?project=${encodeURIComponent(projectId)}`, {
      method: "POST",
      body,
    });
    const data = await response.json().catch(() => null) as { url?: unknown; message?: unknown } | null;
    if (!response.ok || typeof data?.url !== "string") {
      return {
        ok: false,
        message: typeof data?.message === "string"
          ? data.message
          : "No se pudo subir la imagen.",
      };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, message: "No se pudo subir la imagen." };
  }
}

/**
 * Extrae las imágenes de un `DataTransfer` de pegado o arrastre.
 * @param transfer - Datos del portapapeles o arrastre.
 * @returns Archivos de imagen válidos, en orden.
 */
export function imageFilesFromDataTransfer(transfer: DataTransfer | null): File[] {
  if (!transfer) return [];
  const files = Array.from(transfer.files ?? []).filter((file) => file.type.startsWith("image/"));
  if (files.length) return files;
  for (const item of Array.from(transfer.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file?.type.startsWith("image/")) files.push(file);
  }
  return files;
}
