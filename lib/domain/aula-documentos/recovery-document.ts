import { createLocalState, type ClientStorage } from "../../client-storage";
import { AULA_DOCUMENT_JSON_MAX_LENGTH, type AulaDocument } from "./document";
import {
  AULA_RECOVERY_MAX_COPIES,
  AULA_RECOVERY_MAX_TOTAL_BYTES,
  AULA_RECOVERY_REASONS,
  type AulaRecoveryCopy,
  type AulaRecoveryReason,
  type SaveAulaRecoveryResult,
} from "./recovery-types";
import { listAulaRecoveryCopies } from "./recovery";

type StoredRecovery = {
  version: 1;
  copies: AulaRecoveryCopy[];
};

type RecoveryStorage = ClientStorage;

const STORAGE_PREFIX = "aula-kanban:aula-documentos:recuperacion:";
const STORAGE_VERSION = 1;

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
 * Comprueba si un valor tiene la forma de una copia recuperable.
 * @param value - Valor leído de `localStorage`.
 * @returns `true` si se puede mostrar y descargar.
 */
function isRecoveryCopy(value: unknown): value is AulaRecoveryCopy {
  if (!value || typeof value !== "object") return false;
  const copy = value as Partial<AulaRecoveryCopy>;
  return typeof copy.id === "string"
    && copy.id.length > 0
    && typeof copy.createdAt === "number"
    && Number.isFinite(copy.createdAt)
    && typeof copy.reason === "string"
    && (AULA_RECOVERY_REASONS as readonly string[]).includes(copy.reason)
    && typeof copy.title === "string"
    && (copy.serverUpdatedAt === null || typeof copy.serverUpdatedAt === "number")
    && Boolean(copy.document)
    && typeof copy.document === "object";
}

/**
 * Normaliza una lista de copias del documento.
 * @param value - Valor leído.
 * @returns Copias válidas o `null`.
 */
function normalizeCopies(value: unknown): AulaRecoveryCopy[] | null {
  const rawCopies = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      && (value as Partial<StoredRecovery>).version === STORAGE_VERSION
      && Array.isArray((value as Partial<StoredRecovery>).copies)
      ? (value as StoredRecovery).copies
      : null;
  if (!rawCopies) return null;
  return rawCopies
    .filter(isRecoveryCopy)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, AULA_RECOVERY_MAX_COPIES);
}

/**
 * Crea el estado local versionado de un documento.
 * @param storage - Almacenamiento inyectado.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @returns El estado local de copias.
 */
function createDocumentRecoveryState(storage: RecoveryStorage, projectId: string, documentId: string) {
  return createLocalState<AulaRecoveryCopy[]>({
    key: aulaDocumentRecoveryStorageKey(projectId, documentId),
    version: STORAGE_VERSION,
    validate: normalizeCopies,
    fallback: () => [],
    storage,
  });
}

/**
 * Lee las copias locales de un documento.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @returns Las copias válidas.
 */
export function listDocumentRecoveryCopies(storage: RecoveryStorage, projectId: string, documentId: string): AulaRecoveryCopy[] {
  return createDocumentRecoveryState(storage, projectId, documentId).read();
}

/**
 * Crea un identificador estable para la copia.
 * @param createdAt - Marca de tiempo.
 * @returns Identificador único.
 */
function createRecoveryId(createdAt: number): string {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${createdAt}-${random}`;
}

/**
 * Calcula el tamaño serializado del conjunto de copias.
 * @param copies - Copias candidatas.
 * @returns Longitud en caracteres del JSON.
 */
function payloadLength(copies: AulaRecoveryCopy[]): number {
  return JSON.stringify({ version: STORAGE_VERSION, copies } satisfies StoredRecovery).length;
}

/**
 * Guarda una copia local de un documento, purgando las más antiguas si hace falta.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param documentId - Documento de la suite.
 * @param input - Documento, motivo y metadatos opcionales.
 * @returns Las copias conservadas o el motivo del fallo.
 */
export function saveDocumentRecoveryCopy(
  storage: RecoveryStorage,
  projectId: string,
  documentId: string,
  input: {
    document: AulaDocument;
    reason: AulaRecoveryReason;
    serverUpdatedAt: number | null;
    now?: number;
    id?: string;
  },
): SaveAulaRecoveryResult {
  const serialized = JSON.stringify(input.document);
  if (serialized.length > AULA_DOCUMENT_JSON_MAX_LENGTH) {
    return { ok: false, reason: "too-large" };
  }

  const createdAt = input.now ?? Date.now();
  const copy: AulaRecoveryCopy = {
    id: input.id ?? createRecoveryId(createdAt),
    createdAt,
    reason: input.reason,
    title: input.document.title,
    serverUpdatedAt: input.serverUpdatedAt,
    document: input.document,
  };
  const existing = listDocumentRecoveryCopies(storage, projectId, documentId);
  let copies = [copy, ...existing].slice(0, AULA_RECOVERY_MAX_COPIES);
  let purged = Math.max(0, existing.length + 1 - copies.length);
  const state = createDocumentRecoveryState(storage, projectId, documentId);

  while (copies.length > 1 && payloadLength(copies) > AULA_RECOVERY_MAX_TOTAL_BYTES) {
    copies = copies.slice(0, -1);
    purged += 1;
  }
  if (payloadLength(copies) > AULA_RECOVERY_MAX_TOTAL_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  while (copies.length > 0) {
    const result = state.write(copies);
    if (result.ok) return { ok: true, copies, purged };
    if (result.reason === "serialize") return { ok: false, reason: "too-large" };
    if (copies.length <= 1) return { ok: false, reason: "quota" };
    copies = copies.slice(0, -1);
    purged += 1;
  }
  return { ok: false, reason: "quota" };
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
  storage: RecoveryStorage,
  projectId: string,
  documentId: string,
): { ok: true; copies: AulaRecoveryCopy[]; migrated: boolean } | { ok: false; reason: "unavailable" | "quota" | "serialize" } {
  const target = createDocumentRecoveryState(storage, projectId, documentId);
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
