import type { ClientStorage } from "../../client-storage";
import {
  createRecoveryState,
  readRecoveryCopies,
  saveRecoveryCopy,
  type SaveRecoveryInput,
} from "./recovery-store";
import type { AulaRecoveryCopy, SaveAulaRecoveryResult } from "./recovery-types";
import { listAulaRecoveryCopies } from "./recovery";

const STORAGE_PREFIX = "aula-kanban:aula-documentos:recuperacion:";

/**
 * Construye la clave de recuperación de un documento.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @returns La clave estable usada en `localStorage`.
 */
export function aulaDocumentRecoveryStorageKey(projectId: string, documentId: string): string {
  return `${STORAGE_PREFIX}${projectId}:${encodeURIComponent(documentId)}`;
}

/**
 * Lee las copias locales de un documento.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @returns Las copias válidas.
 */
export function listDocumentRecoveryCopies(
  storage: ClientStorage,
  projectId: string,
  documentId: string,
): AulaRecoveryCopy[] {
  return readRecoveryCopies(storage, aulaDocumentRecoveryStorageKey(projectId, documentId));
}

/**
 * Guarda una copia local de un documento.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @param input - Documento, motivo y metadatos opcionales.
 * @returns Las copias conservadas o el motivo del fallo.
 */
export function saveDocumentRecoveryCopy(
  storage: ClientStorage,
  projectId: string,
  documentId: string,
  input: SaveRecoveryInput,
): SaveAulaRecoveryResult {
  return saveRecoveryCopy(storage, aulaDocumentRecoveryStorageKey(projectId, documentId), input);
}

/**
 * Migra las recuperaciones antiguas del proyecto al documento indicado.
 * Solo actúa si la clave del documento no existe; no borra la clave antigua.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento destino.
 * @returns Las copias migradas o el motivo del fallo.
 */
export function migrateDocumentRecoveryCopies(
  storage: ClientStorage,
  projectId: string,
  documentId: string,
): { ok: true; copies: AulaRecoveryCopy[]; migrated: boolean } | { ok: false; reason: "unavailable" | "quota" | "serialize" } {
  const target = createRecoveryState(storage, aulaDocumentRecoveryStorageKey(projectId, documentId));
  if (target.readResult().status !== "missing") {
    return { ok: true, copies: target.read(), migrated: false };
  }
  const legacy = listAulaRecoveryCopies(storage, projectId);
  if (legacy.length === 0) return { ok: true, copies: [], migrated: false };
  const written = target.write(legacy);
  return written.ok
    ? { ok: true, copies: legacy, migrated: true }
    : { ok: false, reason: written.reason };
}
