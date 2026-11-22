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

/**
 * Envía un estado a un endpoint que acepta `expectedUpdatedAt`.
 *
 * La operación solo cubre la petición y la interpretación del conflicto; cada
 * cliente conserva su carga, sus mensajes y su estado local.
 * @param endpoint - URL del documento que se guarda.
 * @param state - Estado completo que se quiere persistir.
 * @param expectedUpdatedAt - Versión conocida o `null` si el documento es nuevo.
 * @returns El resultado del servidor o un fallo de red.
 */
export async function saveVersionedDocument(
  endpoint: string,
  state: unknown,
  expectedUpdatedAt: number | null,
): Promise<VersionedSaveResult> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state, expectedUpdatedAt }),
    });
    if (response.status === 409) {
      let current: number | null = null;
      try {
        const data = await response.json() as { updatedAt?: number | null };
        if (typeof data.updatedAt === "number") current = data.updatedAt;
      } catch {
        current = null;
      }
      return { status: "conflict", updatedAt: current };
    }
    if (!response.ok) return { status: "failed" };
    const data = await response.json() as { updatedAt?: number };
    return {
      status: "saved",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    };
  } catch {
    return { status: "failed" };
  }
}
