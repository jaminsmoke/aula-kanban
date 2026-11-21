/** Resultado de leer el documento de una app o de la suite. */
export type LoadedDocument<T> = {
  state: T | null;
  updatedAt: number | null;
  ok?: boolean;
};

/** Resultado de un guardado con comprobación de versión. */
export type VersionedSaveResult =
  | { status: "saved"; updatedAt: number }
  | { status: "conflict"; updatedAt: number | null }
  | { status: "failed" };
