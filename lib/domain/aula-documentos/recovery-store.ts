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

type StoredRecovery = {
  version: 1;
  copies: AulaRecoveryCopy[];
};

/** Entrada común para guardar una copia local. */
export type SaveRecoveryInput = {
  document: AulaDocument;
  reason: AulaRecoveryReason;
  serverUpdatedAt: number | null;
  now?: number;
  id?: string;
};

const STORAGE_VERSION = 1;

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
 * Normaliza una lista de copias, incluidas las del formato anterior.
 * @param value - Array actual o envoltura `{ version, copies }` anterior.
 * @returns Las copias válidas o `null` si la forma no es reconocible.
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
 * Crea el estado local versionado de las copias de recuperación.
 * @param storage - Almacenamiento inyectado.
 * @param key - Clave estable del proyecto o documento.
 * @returns El estado local de copias.
 */
export function createRecoveryState(storage: ClientStorage, key: string) {
  return createLocalState<AulaRecoveryCopy[]>({
    key,
    version: STORAGE_VERSION,
    validate: normalizeCopies,
    fallback: () => [],
    storage,
  });
}

/**
 * Lee las copias locales válidas, de la más reciente a la más antigua.
 * @param storage - Almacenamiento del navegador.
 * @param key - Clave estable del proyecto o documento.
 * @returns Las copias válidas, como máximo el límite configurado.
 */
export function readRecoveryCopies(storage: ClientStorage, key: string): AulaRecoveryCopy[] {
  return createRecoveryState(storage, key).read();
}

/**
 * Crea un identificador estable sin depender de una API concreta del navegador.
 * @param createdAt - Marca de tiempo de la copia.
 * @returns Un id único para la entrada.
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
 * Guarda una copia local, purgando las más antiguas si se supera el límite de
 * número, tamaño o cuota del navegador.
 * @param storage - Almacenamiento del navegador.
 * @param key - Clave estable del proyecto o documento.
 * @param input - Documento, motivo, versión del servidor y metadatos opcionales.
 * @returns Las copias conservadas o el motivo del fallo.
 */
export function saveRecoveryCopy(
  storage: ClientStorage,
  key: string,
  input: SaveRecoveryInput,
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
  const state = createRecoveryState(storage, key);
  const existing = state.read();
  let copies = [copy, ...existing].slice(0, AULA_RECOVERY_MAX_COPIES);
  let purged = Math.max(0, existing.length + 1 - copies.length);

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
