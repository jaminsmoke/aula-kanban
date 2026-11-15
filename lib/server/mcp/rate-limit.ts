/**
 * Límite básico de peticiones por token del MCP (Fase 3).
 *
 * Es una ventana fija en memoria del isolate: 120 peticiones por minuto y
 * token. No sustituye un límite distribuido; su objetivo es frenar errores
 * de cliente o abusos simples sin coste en D1.
 */

export const MCP_RATE_WINDOW_MS = 60_000;
export const MCP_RATE_MAX = 120;
/** Tope de escrituras del plugin por cuenta y minuto (MCP-00). */
export const MCP_WRITE_RATE_MAX = 30;

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

/**
 * Comprueba y cuenta una petición del token en la ventana actual.
 * @param tokenId - Identificador del token autenticado.
 * @param now - Instante de la llamada (inyectable para pruebas).
 * @param max - Tope en la ventana (por defecto `MCP_RATE_MAX`).
 * @returns `true` si cabe dentro del límite.
 */
export function checkMcpRateLimit(tokenId: string, now = Date.now(), max = MCP_RATE_MAX): boolean {
  const bucket = buckets.get(tokenId);
  if (!bucket || now - bucket.windowStart >= MCP_RATE_WINDOW_MS) {
    buckets.set(tokenId, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

/**
 * Vacía los contadores (pruebas).
 */
export function clearMcpRateLimits(): void {
  buckets.clear();
}
