export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

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
