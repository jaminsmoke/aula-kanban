export type BoardElement = { id: string; version: number; versionNonce?: number; isDeleted?: boolean; [key: string]: unknown };
export type BoardFile = { mimeType?: string; id?: string; dataURL?: string; status?: string; error?: unknown; created?: number };
export type BoardSnapshot = { type?: string; version?: number; source?: string; elements?: BoardElement[]; appState?: Record<string, unknown>; files?: Record<string, BoardFile> };
export type BoardResponse = { ownerType: string; ownerId: string; snapshot: string; revision: number; updatedAt: number };

export const EMPTY_SNAPSHOT: BoardSnapshot = { type: "excalidraw", version: 2, source: "aula-kanban", elements: [], appState: {}, files: {} };
export const SAVE_DEBOUNCE_MS = 800;
export const BROADCAST_DEBOUNCE_MS = 150;
export const POLL_MS = 5000;
export const RECONNECT_MS = 5000;
const PRESENCE_COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5", "#0ca678"];

/**
 * Fusiona elementos locales y remotos con último-escritura-gana.
 * @param local - Elementos actuales de la pizarra.
 * @param remote - Elementos que llegan de otra vista.
 * @returns Los elementos fusionados, incluidas las tumbas de borrado.
 */
export function mergeElements(local: BoardElement[], remote: BoardElement[]) {
  const map = new Map(local.map((element) => [element.id, element]));
  for (const element of remote) {
    const current = map.get(element.id);
    if (!current || (element.version ?? 0) > (current.version ?? 0) || ((element.version ?? 0) === (current.version ?? 0) && (element.versionNonce ?? 0) > (current.versionNonce ?? 0))) {
      map.set(element.id, element);
    }
  }
  return [...map.values()];
}

/**
 * Elige un color de presencia estable a partir del identificador de la cuenta.
 * @param userId - Identificador de la cuenta.
 * @returns Un color hexadecimal de la paleta de presencia.
 */
export function colorForUser(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

/**
 * Interpreta un snapshot guardado; si está vacío o corrupto devuelve plantilla vacía.
 * @param raw - Cadena JSON del snapshot o vacía.
 * @returns El snapshot con elementos, estado y ficheros.
 */
export function parseSnapshot(raw: string): BoardSnapshot {
  if (!raw) return EMPTY_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as BoardSnapshot;
    if (!parsed || !Array.isArray(parsed.elements)) return EMPTY_SNAPSHOT;
    // `appState.collaborators` es un `Map` en memoria: no sobrevive al JSON
    // (`{}`) y Excalidraw espera un `Map` al recargar la escena.
    const appState = { ...(parsed.appState ?? {}) };
    delete appState.collaborators;
    return { ...EMPTY_SNAPSHOT, ...parsed, appState, files: parsed.files ?? {} };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/**
 * Sube un blob de imagen de la pizarra al almacenamiento y devuelve su URL interna.
 * @param dataUrl - Imagen embebida como `data:`.
 * @param mimeType - Tipo MIME de la imagen.
 * @returns La URL interna (`/api/files/…`) o `null` si no se pudo subir.
 */
export async function uploadBlob(dataUrl: string, mimeType: string) {
  try {
    const projectId = new URLSearchParams(window.location.search).get("project") || "default";
    const blob = await (await fetch(dataUrl)).blob();
    const body = new FormData();
    body.append("file", new File([blob], "board-image", { type: mimeType || blob.type || "image/png" }));
    body.append("purpose", "board-asset");
    const response = await fetch(`/api/uploads?project=${encodeURIComponent(projectId)}`, { method: "POST", body });
    const data = await response.json().catch(() => null) as { url?: unknown } | null;
    if (!response.ok || typeof data?.url !== "string") return null;
    return data.url as string;
  } catch {
    return null;
  }
}

/**
 * Firma barata de la escena: número de elementos y suma de sus versiones y
 * nonces, más los ficheros. Excalidraw dispara `onChange` también ante
 * cambios de `appState` (por ejemplo el puntero); sin esta comparación cada
 * movimiento del ratón reiniciaría el temporizador de guardado.
 * @param elements - Elementos de la escena.
 * @param files - Ficheros (blobs) de la escena.
 * @returns Cadena comparable de igualdad.
 */
export function sceneSignature(elements: readonly BoardElement[], files: Record<string, BoardFile>): string {
  let total = 0;
  for (const element of elements) total += (element?.version ?? 0) + (element?.versionNonce ?? 0);
  let fileTotal = 0;
  for (const file of Object.values(files)) fileTotal += file?.dataURL?.length ?? 0;
  return `${elements.length}:${total}:${Object.keys(files).length}:${fileTotal}`;
}
