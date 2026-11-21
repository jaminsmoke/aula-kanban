import type { ClientStorage } from "../../client-storage";
import { readRecoveryCopies, saveRecoveryCopy, type SaveRecoveryInput } from "./recovery-store";
import type { AulaRecoveryCopy, SaveAulaRecoveryResult } from "./recovery-types";

export {
  AULA_RECOVERY_MAX_COPIES,
  AULA_RECOVERY_MAX_TOTAL_BYTES,
} from "./recovery-types";
export type { AulaRecoveryCopy, AulaRecoveryReason, SaveAulaRecoveryResult } from "./recovery-types";

const STORAGE_PREFIX = "aula-kanban:aula-documentos:recuperacion:";

/**
 * Construye la clave de almacenamiento de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns La clave estable usada en `localStorage`.
 */
export function aulaRecoveryStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

/**
 * Lee las copias locales válidas de un proyecto, de la más reciente a la más antigua.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @returns Las copias válidas, como máximo el límite configurado.
 */
export function listAulaRecoveryCopies(storage: ClientStorage, projectId: string): AulaRecoveryCopy[] {
  return readRecoveryCopies(storage, aulaRecoveryStorageKey(projectId));
}

/**
 * Guarda una copia local de un proyecto.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param input - Documento, motivo, versión del servidor y metadatos opcionales.
 * @returns Las copias conservadas o el motivo del fallo.
 */
export function saveAulaRecoveryCopy(
  storage: ClientStorage,
  projectId: string,
  input: SaveRecoveryInput,
): SaveAulaRecoveryResult {
  return saveRecoveryCopy(storage, aulaRecoveryStorageKey(projectId), input);
}
