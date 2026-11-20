/** Almacenamiento mínimo que necesita el contrato. */
export type ClientStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Envoltura persistida con versión de esquema. */
type StoredEnvelope = {
  __aulaClientStorage: 1;
  version: number;
  data: unknown;
};

/** Estado de una lectura tolerante a fallos. */
export type LocalStateReadStatus = "ok" | "missing" | "invalid" | "future" | "unavailable";

/** Resultado de leer un estado local. */
export type LocalStateReadResult<T> = {
  value: T;
  status: LocalStateReadStatus;
  migrated: boolean;
};

/** Resultado de escribir o eliminar un estado local. */
export type LocalStateWriteResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "quota" | "serialize" };

/** Opciones de un estado local versionado. */
export type LocalStateOptions<T> = {
  /** Clave completa de `localStorage`. */
  key: string;
  /** Versión actual del esquema. */
  version: number;
  /** Valida y normaliza el valor actual. */
  validate: (value: unknown) => T | null;
  /** Migra un valor de una versión anterior. */
  migrate?: (value: unknown, fromVersion: number) => T | null;
  /** Valor por defecto si no hay datos válidos. */
  fallback: () => T;
  /** Almacenamiento inyectable; `null` simula un navegador sin storage. */
  storage?: ClientStorage | null;
};

/** Estado local listo para consumir. */
export type LocalState<T> = {
  key: string;
  read: () => T;
  readResult: () => LocalStateReadResult<T>;
  write: (value: T) => LocalStateWriteResult;
  remove: () => LocalStateWriteResult;
};

/**
 * Construye una clave con el espacio de nombres de la aplicación.
 * @param area - Área funcional.
 * @param segments - Partes adicionales, normalmente proyecto o app.
 * @returns La clave completa.
 */
export function clientStorageKey(area: string, ...segments: string[]): string {
  return ["aula-kanban", area, ...segments.map((segment) => encodeURIComponent(segment))].join(":");
}

/**
 * Obtiene `localStorage` solo cuando existe un navegador.
 * @returns El almacenamiento o `null` durante SSR o si está bloqueado.
 */
function browserStorage(): ClientStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Comprueba si un valor tiene la envoltura versionada.
 * @param value - Valor candidato.
 * @returns `true` si la envoltura es reconocible.
 */
function isEnvelope(value: unknown): value is StoredEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredEnvelope>;
  return candidate.__aulaClientStorage === 1
    && typeof candidate.version === "number"
    && Number.isInteger(candidate.version)
    && "data" in candidate;
}

/**
 * Comprueba si un error de almacenamiento es de cuota.
 * @param error - Error lanzado por el navegador.
 * @returns `true` si representa falta de espacio.
 */
function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === "QuotaExceededError"
    || candidate.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || candidate.code === 22
    || candidate.code === 1014;
}

/**
 * Crea un estado local versionado, validado y tolerante a fallos.
 * @param options - Clave, versión, validación, migración y almacenamiento.
 * @returns Operaciones de lectura, escritura y eliminación.
 */
export function createLocalState<T>(options: LocalStateOptions<T>): LocalState<T> {
  const storage = () => options.storage === undefined ? browserStorage() : options.storage;

  /**
   * Convierte un valor antiguo o actual en el tipo esperado.
   * @param value - Valor leído.
   * @param fromVersion - Versión de origen.
   * @param migrated - Indica si hubo migración.
   * @returns El valor o `null` si no es válido.
   */
  function normalize(value: unknown, fromVersion: number, migrated: boolean): { value: T; migrated: boolean } | null {
    try {
      const migratedValue = options.migrate && fromVersion < options.version
        ? options.migrate(value, fromVersion)
        : null;
      const next = migratedValue ?? options.validate(value);
      return next === null ? null : { value: next, migrated };
    } catch {
      return null;
    }
  }

  const readResult = (): LocalStateReadResult<T> => {
    const fallback = options.fallback;
    const store = storage();
    if (!store) return { value: fallback(), status: "unavailable", migrated: false };

    let raw: string | null;
    try {
      raw = store.getItem(options.key);
    } catch {
      return { value: fallback(), status: "unavailable", migrated: false };
    }
    if (raw === null) return { value: fallback(), status: "missing", migrated: false };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      const legacy = normalize(raw, 0, true);
      return legacy
        ? { value: legacy.value, status: "ok", migrated: true }
        : { value: fallback(), status: "invalid", migrated: false };
    }

    if (isEnvelope(parsed)) {
      if (parsed.version > options.version) {
        return { value: fallback(), status: "future", migrated: false };
      }
      const normalized = normalize(parsed.data, parsed.version, parsed.version < options.version);
      return normalized
        ? { value: normalized.value, status: "ok", migrated: normalized.migrated }
        : { value: fallback(), status: "invalid", migrated: false };
    }

    const normalized = normalize(parsed, 0, true);
    return normalized
      ? { value: normalized.value, status: "ok", migrated: true }
      : { value: fallback(), status: "invalid", migrated: false };
  };

  const read = () => readResult().value;

  const write = (value: T): LocalStateWriteResult => {
    const store = storage();
    if (!store) return { ok: false, reason: "unavailable" };

    let serialized: string;
    try {
      serialized = JSON.stringify({
        __aulaClientStorage: 1,
        version: options.version,
        data: value,
      } satisfies StoredEnvelope);
    } catch {
      return { ok: false, reason: "serialize" };
    }

    try {
      store.setItem(options.key, serialized);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
    }
  };

  const remove = (): LocalStateWriteResult => {
    const store = storage();
    if (!store) return { ok: false, reason: "unavailable" };
    try {
      store.removeItem(options.key);
      return { ok: true };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  };

  return {
    key: options.key,
    read,
    readResult,
    write,
    remove,
  };
}
