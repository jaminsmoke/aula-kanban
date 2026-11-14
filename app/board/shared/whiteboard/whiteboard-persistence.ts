import { request } from "../api";
import { mergeElements, type BoardFile, type BoardResponse, type BoardSnapshot, uploadBlob } from "./whiteboard-model";

/**
 * Carga el snapshot de una pizarra desde la API.
 * @param boardId - Identificador de la pizarra.
 * @param ownerType - Tipo de dueño de la pizarra.
 * @returns La respuesta persistida.
 */
export async function fetchBoardSnapshot(boardId: string, ownerType: "task" | "project" | "space"): Promise<BoardResponse> {
  const projectId = new URLSearchParams(window.location.search).get("project") || "default";
  const query = new URLSearchParams({ project: projectId, ownerType, ownerId: boardId });
  const response = await fetch(`/api/boards?${query}`, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) throw new Error("pizarra");
  return data as BoardResponse;
}

/**
 * Guarda un snapshot de pizarra con control de revisión.
 * @param boardId - Identificador de la pizarra.
 * @param ownerType - Tipo de dueño de la pizarra.
 * @param snapshot - Snapshot serializado.
 * @param revision - Revisión conocida.
 * @returns La respuesta guardada.
 */
export function saveBoardSnapshot(boardId: string, ownerType: "task" | "project" | "space", snapshot: string, revision: number): Promise<BoardResponse> {
  return request<BoardResponse>("PUT", { ownerType, ownerId: boardId, snapshot, revision }, "/api/boards");
}

/**
 * Fusiona el estado local con la escena remota cuando el guardado encuentra un conflicto.
 * @param current - Snapshot local pendiente.
 * @param remote - Snapshot leído de la API.
 * @returns El snapshot combinado.
 */
export function mergeConflictSnapshot(current: BoardSnapshot, remote: BoardSnapshot): BoardSnapshot {
  const elements = mergeElements(current.elements ?? [], remote.elements ?? []);
  const files = { ...(remote.files ?? {}), ...(current.files ?? {}) };
  return { ...current, elements, files };
}

/**
 * Combina una escena recibida en directo, dando prioridad a sus archivos actualizados.
 * @param current - Snapshot local.
 * @param remote - Snapshot recibido.
 * @returns El snapshot combinado.
 */
export function mergeIncomingSnapshot(current: BoardSnapshot, remote: BoardSnapshot): BoardSnapshot {
  const merged = mergeConflictSnapshot(current, remote);
  return { ...merged, files: { ...(current.files ?? {}), ...(remote.files ?? {}) } };
}

/**
 * Sube las imágenes pendientes de un snapshot y devuelve los ficheros normalizados.
 * @param files - Ficheros de la escena.
 * @param uploaded - URLs ya subidas, por identificador.
 * @param uploading - Identificadores que ya están subiéndose.
 * @returns Los ficheros listos para guardar.
 */
export async function uploadBoardFiles(
  files: Record<string, BoardFile>,
  uploaded: Map<string, string>,
  uploading: Set<string>,
): Promise<Record<string, BoardFile>> {
  const next = { ...files };
  for (const [fileId, file] of Object.entries(next)) {
    if (file?.dataURL?.startsWith("data:") && uploaded.has(fileId)) {
      next[fileId] = { ...file, dataURL: uploaded.get(fileId), status: "saved" };
    } else if (file?.dataURL?.startsWith("data:") && !uploading.has(fileId)) {
      uploading.add(fileId);
      try {
        const url = await uploadBlob(file.dataURL, file.mimeType || "");
        if (!url) throw new Error("No se pudo subir una imagen de la pizarra.");
        uploaded.set(fileId, url);
        next[fileId] = { ...file, dataURL: url, status: "saved" };
      } finally {
        uploading.delete(fileId);
      }
    }
  }
  return next;
}
