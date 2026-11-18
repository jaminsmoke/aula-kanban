import { AULA_DOCUMENT_JSON_MAX_LENGTH, type AulaDocument } from "./document";

/** Copias locales que se conservan antes de purgar las más antiguas. */
export const AULA_RECOVERY_MAX_COPIES = 3;

/** Tamaño total máximo del conjunto de copias en `localStorage`. */
export const AULA_RECOVERY_MAX_TOTAL_BYTES = 420_000;

/** Motivo por el que se creó una copia local. */
export const AULA_RECOVERY_REASONS = ["conflict", "replace"] as const;
export type AulaRecoveryReason = (typeof AULA_RECOVERY_REASONS)[number];

/** Etiquetas legibles de los motivos de recuperación. */
export const AULA_RECOVERY_REASON_LABELS: Record<AulaRecoveryReason, string> = {
  conflict: "Conflicto de versión",
  replace: "Antes de reemplazar",
};

/** Copia recuperable de un documento guardada en el navegador. */
export type AulaRecoveryCopy = {
  id: string;
  createdAt: number;
  reason: AulaRecoveryReason;
  title: string;
  serverUpdatedAt: number | null;
  document: AulaDocument;
};

/** Resultado de guardar una copia local. */
export type SaveAulaRecoveryResult =
  | { ok: true; copies: AulaRecoveryCopy[]; purged: number }
  | { ok: false; reason: "too-large" | "quota" };

type StoredRecovery = {
  version: 1;
  copies: AulaRecoveryCopy[];
};

type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_PREFIX = "aula-kanban:aula-documentos:recuperacion:";
const STORAGE_VERSION = 1;

/**
 * Construye la clave de almacenamiento de un proyecto.
 * @param projectId - Proyecto activo.
 * @returns La clave estable usada en `localStorage`.
 */
export function aulaRecoveryStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
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
 * Lee las copias locales válidas de un proyecto, de la más reciente a la más antigua.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @returns Las copias válidas, como máximo el límite configurado.
 */
export function listAulaRecoveryCopies(storage: RecoveryStorage, projectId: string): AulaRecoveryCopy[] {
  try {
    const raw = storage.getItem(aulaRecoveryStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return [];
    const stored = parsed as Partial<StoredRecovery>;
    if (stored.version !== STORAGE_VERSION || !Array.isArray(stored.copies)) return [];
    return stored.copies
      .filter(isRecoveryCopy)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, AULA_RECOVERY_MAX_COPIES);
  } catch {
    return [];
  }
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
 * Guarda una copia local, purgando las más antiguas si se supera el límite de
 * número, tamaño o cuota del navegador.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param input - Documento, motivo, versión del servidor y metadatos opcionales.
 * @returns Las copias conservadas o el motivo del fallo.
 */
export function saveAulaRecoveryCopy(
  storage: RecoveryStorage,
  projectId: string,
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
  const existing = listAulaRecoveryCopies(storage, projectId);
  let copies = [copy, ...existing].slice(0, AULA_RECOVERY_MAX_COPIES);
  let purged = Math.max(0, existing.length + 1 - copies.length);
  const storageKey = aulaRecoveryStorageKey(projectId);
  const payload = () => JSON.stringify({ version: STORAGE_VERSION, copies } satisfies StoredRecovery);

  while (copies.length > 1 && payload().length > AULA_RECOVERY_MAX_TOTAL_BYTES) {
    copies = copies.slice(0, -1);
    purged += 1;
  }
  if (payload().length > AULA_RECOVERY_MAX_TOTAL_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  while (copies.length > 0) {
    try {
      storage.setItem(storageKey, payload());
      return { ok: true, copies, purged };
    } catch {
      if (copies.length <= 1) return { ok: false, reason: "quota" };
      copies = copies.slice(0, -1);
      purged += 1;
    }
  }
  return { ok: false, reason: "quota" };
}
