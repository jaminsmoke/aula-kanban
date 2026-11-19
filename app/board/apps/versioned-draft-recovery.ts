/** Tamaño máximo de una copia local de borrador, en caracteres JSON. */
export const VERSIONED_DRAFT_RECOVERY_MAX_BYTES = 420_000;

/** Motivo por el que se guarda una copia recuperable. */
export const VERSIONED_DRAFT_RECOVERY_REASONS = ["conflict", "replace"] as const;
export type VersionedDraftRecoveryReason = (typeof VERSIONED_DRAFT_RECOVERY_REASONS)[number];

/** Copia recuperable de un borrador guardada en el navegador. */
export type VersionedDraftRecoveryCopy<T> = {
  version: 1;
  createdAt: number;
  reason: VersionedDraftRecoveryReason;
  serverUpdatedAt: number | null;
  value: T;
};

/** Resultado de guardar una copia recuperable. */
export type SaveVersionedDraftRecoveryResult =
  | { ok: true; copy: VersionedDraftRecoveryCopy<unknown> }
  | { ok: false; reason: "too-large" | "quota" | "invalid" };

type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_PREFIX = "aula-kanban:borrador:";

/**
 * Construye la clave estable de una copia por proyecto y app.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns La clave usada en `localStorage`.
 */
export function versionedDraftRecoveryKey(projectId: string, appId: string): string {
  return `${STORAGE_PREFIX}${projectId}:${appId}`;
}

/**
 * Comprueba si un valor tiene la forma de una copia recuperable.
 * @param value - Valor leído de `localStorage`.
 * @returns `true` si la copia es legible.
 */
function isRecoveryCopy(value: unknown): value is VersionedDraftRecoveryCopy<unknown> {
  if (!value || typeof value !== "object") return false;
  const copy = value as Partial<VersionedDraftRecoveryCopy<unknown>>;
  return copy.version === 1
    && typeof copy.createdAt === "number"
    && Number.isFinite(copy.createdAt)
    && typeof copy.reason === "string"
    && (VERSIONED_DRAFT_RECOVERY_REASONS as readonly string[]).includes(copy.reason)
    && (copy.serverUpdatedAt === null || typeof copy.serverUpdatedAt === "number")
    && copy.value !== undefined
    && copy.value !== null;
}

/**
 * Lee la copia recuperable de un proyecto y app.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @returns La copia válida o `null`.
 */
export function readVersionedDraftRecovery<T>(
  storage: RecoveryStorage,
  projectId: string,
  appId: string,
): VersionedDraftRecoveryCopy<T> | null {
  try {
    const raw = storage.getItem(versionedDraftRecoveryKey(projectId, appId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isRecoveryCopy(parsed) ? parsed as VersionedDraftRecoveryCopy<T> : null;
  } catch {
    return null;
  }
}

/**
 * Guarda una única copia recuperable por proyecto y app. Las copias anteriores
 * se reemplazan para no agotar la cuota del navegador.
 * @param storage - Almacenamiento del navegador.
 * @param projectId - Proyecto activo.
 * @param appId - Identificador de la app.
 * @param input - Valor, motivo, versión del servidor y fecha opcional.
 * @returns La copia guardada o el motivo del fallo.
 */
export function saveVersionedDraftRecovery<T>(
  storage: RecoveryStorage,
  projectId: string,
  appId: string,
  input: {
    value: T;
    reason: VersionedDraftRecoveryReason;
    serverUpdatedAt: number | null;
    now?: number;
  },
): SaveVersionedDraftRecoveryResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(input.value);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (serialized.length > VERSIONED_DRAFT_RECOVERY_MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  const copy: VersionedDraftRecoveryCopy<T> = {
    version: 1,
    createdAt: input.now ?? Date.now(),
    reason: input.reason,
    serverUpdatedAt: input.serverUpdatedAt,
    value: input.value,
  };

  try {
    storage.setItem(
      versionedDraftRecoveryKey(projectId, appId),
      JSON.stringify(copy),
    );
    return { ok: true, copy: copy as VersionedDraftRecoveryCopy<unknown> };
  } catch {
    return { ok: false, reason: "quota" };
  }
}
