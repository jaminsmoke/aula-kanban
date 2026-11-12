/** Error de una petición al tablero con su estado HTTP. */
export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Pide datos a la API del tablero y lanza `RequestError` si falla.
 * @param method - Método HTTP de la petición.
 * @param body - Cuerpo JSON opcional.
 * @param path - Ruta de la API (por defecto `/api/tasks`).
 * @param projectIdParam - Proyecto explícito; si falta se lee de la URL.
 * @returns El cuerpo JSON de la respuesta tipado como `T`.
 */
export async function request<T>(method = "GET", body?: unknown, path = "/api/tasks", projectIdParam?: string): Promise<T> {
  const projectId = projectIdParam || new URLSearchParams(window.location.search).get("project") || "default";
  const url = path === "/api/projects" ? path : `${path}?project=${encodeURIComponent(projectId)}`;
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message : "No se pudo conectar con el tablero. Inténtalo de nuevo.";
    throw new RequestError(message, response.status);
  }
  return data as T;
}
