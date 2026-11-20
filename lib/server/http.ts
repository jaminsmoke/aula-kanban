/**
 * Envoltura común para respuestas JSON de la API.
 * @param body - Cuerpo que se serializa como JSON.
 * @param status - Código HTTP de la respuesta.
 * @returns Respuesta JSON sin caché.
 */
export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Comprueba que una petición procede del mismo origen que la URL solicitada.
 * @param request - Petición entrante.
 * @returns `true` cuando `Origin` existe y coincide con el origen de la URL.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

/**
 * Comprueba que una petición declara un cuerpo JSON.
 * @param request - Petición entrante.
 * @returns `true` para `application/json`, con parámetros opcionales.
 */
export function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  return contentType?.split(";")[0].trim().toLowerCase() === "application/json";
}

/** Mensaje único cuando el binding R2 no está disponible en el despliegue. */
const STORAGE_UNAVAILABLE_MESSAGE = "El almacenamiento no está disponible en este despliegue.";

/**
 * Respuesta común de almacenamiento no disponible.
 * @returns Respuesta JSON 503 con el mensaje único.
 */
export function storageUnavailable(): Response {
  return json({ message: STORAGE_UNAVAILABLE_MESSAGE }, 503);
}
