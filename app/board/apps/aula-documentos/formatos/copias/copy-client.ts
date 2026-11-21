/** Resumen de una copia portable devuelta por la API. */
export type AulaCopySummary = {
  id: string;
  title: string;
  format: string;
  formatVersion: number;
  schemaVersion: number;
  sizeBytes: number;
  author: string;
  createdAt: number;
  documentId?: string | null;
  downloadUrl: string;
};

/** Resultado de una llamada de copias. */
export type AulaCopyClientResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

/**
 * Lee el mensaje de error de una respuesta JSON.
 * @param response - Respuesta fallida.
 * @param fallback - Mensaje de respaldo.
 * @returns El mensaje legible.
 */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null) as { message?: unknown } | null;
  return typeof data?.message === "string" ? data.message : fallback;
}

/**
 * Lista las copias portables del proyecto.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento opcional de la suite.
 * @returns La lista o un error legible.
 */
export async function listAulaCopies(
  projectId: string,
  documentId?: string | null,
): Promise<AulaCopyClientResult<{ copies: AulaCopySummary[] }>> {
  try {
    const documentQuery = documentId ? `&doc=${encodeURIComponent(documentId)}` : "";
    const response = await fetch(`/api/aula-documentos/copies?project=${encodeURIComponent(projectId)}${documentQuery}`, {
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, message: await errorMessage(response, "No se pudieron leer las copias.") };
    const data = await response.json() as { copies?: unknown };
    if (!Array.isArray(data.copies)) return { ok: false, message: "La respuesta de copias no es válida." };
    return { ok: true, copies: data.copies as AulaCopySummary[] };
  } catch {
    return { ok: false, message: "No se pudieron leer las copias del proyecto." };
  }
}

/**
 * Guarda una copia portable en R2.
 * @param projectId - Proyecto activo.
 * @param bytes - ZIP de la copia.
 * @param fileName - Nombre del archivo.
 * @param documentId - Documento opcional de la suite.
 * @returns La copia creada o un error legible.
 */
export async function saveAulaCopy(
  projectId: string,
  bytes: Uint8Array,
  fileName: string,
  documentId?: string | null,
): Promise<AulaCopyClientResult<{ copy: AulaCopySummary }>> {
  const form = new FormData();
  form.append("file", new File([bytes.slice().buffer as ArrayBuffer], fileName, { type: "application/zip" }));
  try {
    const documentQuery = documentId ? `&doc=${encodeURIComponent(documentId)}` : "";
    const response = await fetch(`/api/aula-documentos/copies?project=${encodeURIComponent(projectId)}${documentQuery}`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) return { ok: false, message: await errorMessage(response, "No se pudo guardar la copia.") };
    const data = await response.json() as { copy?: AulaCopySummary };
    if (!data.copy) return { ok: false, message: "La respuesta de la copia no es válida." };
    return { ok: true, copy: data.copy };
  } catch {
    return { ok: false, message: "No se pudo guardar la copia en el proyecto." };
  }
}

/**
 * Descarga una copia guardada en R2.
 * @param copy - Copia elegida.
 * @returns El ZIP o un error legible.
 */
export async function downloadAulaCopy(
  copy: AulaCopySummary,
): Promise<AulaCopyClientResult<{ blob: Blob }>> {
  try {
    const response = await fetch(copy.downloadUrl, { cache: "no-store" });
    if (!response.ok) return { ok: false, message: await errorMessage(response, "No se pudo descargar la copia.") };
    return { ok: true, blob: await response.blob() };
  } catch {
    return { ok: false, message: "No se pudo descargar la copia." };
  }
}

/**
 * Borra una copia guardada en R2.
 * @param copy - Copia elegida.
 * @returns La confirmación o un error legible.
 */
export async function deleteAulaCopy(copy: AulaCopySummary): Promise<AulaCopyClientResult<object>> {
  try {
    const response = await fetch(copy.downloadUrl, { method: "DELETE" });
    if (!response.ok) return { ok: false, message: await errorMessage(response, "No se pudo borrar la copia.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "No se pudo borrar la copia." };
  }
}

/**
 * Formatea bytes para la lista de copias.
 * @param bytes - Tamaño en bytes.
 * @returns Texto legible.
 */
export function aulaCopySizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formatea la fecha de una copia.
 * @param value - Milisegundos desde epoch.
 * @returns Fecha local legible.
 */
export function aulaCopyDateLabel(value: number): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
