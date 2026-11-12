import { env } from "cloudflare:workers";

/** API mínima del gestor: las credenciales nunca llegan al navegador. */
export type ManagedApp = { id: "nodum" | "affine" | "n8n"; status: "installed" | "stopped" | "not_installed" | "working" | "error"; url: string | null; version: string | null };
type ManagerEnv = typeof env & { SPACE_MANAGER_URL?: string; SPACE_MANAGER_TOKEN?: string };

/**
 * Conecta con el gestor fijo de la instancia usando HTTPS y redirecciones deshabilitadas.
 * @param path - Ruta fija de la API del gestor.
 * @param method - Operación solicitada.
 * @returns La respuesta JSON del gestor.
 */
export async function callSpaceManager(path: string, method: "GET" | "POST" | "DELETE") {
  const config = env as ManagerEnv;
  if (!config.SPACE_MANAGER_URL || !config.SPACE_MANAGER_TOKEN) return null;
  const base = new URL(config.SPACE_MANAGER_URL);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("manager_config");
  if (!/^\/v1\/apps(?:\/(?:nodum|affine|n8n)(?:\/reset)?)?$/.test(path)) throw new Error("manager_path");
  let response: Response;
  try {
    response = await fetch(new URL(path, base), {
      method, headers: { Authorization: `Bearer ${config.SPACE_MANAGER_TOKEN}`, Accept: "application/json" },
      redirect: "error", signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    // Solo se registran datos de diagnóstico; nunca cabeceras ni secretos.
    const cause = error instanceof Error ? error.cause : undefined;
    const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined;
    console.error("space_manager_fetch_failed", { name: error instanceof Error ? error.name : "unknown", code });
    throw error;
  }
  if (!response.ok) {
    console.error("space_manager_http_error", { status: response.status });
    throw new Error("manager_unavailable");
  }
  return response.json() as Promise<unknown>;
}
