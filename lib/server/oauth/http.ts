import type { OAuthError } from "./service";

/**
 * Error OAuth en JSON según RFC 6749 §5.2 (sin caché).
 * @param error - Código de error estándar.
 * @param errorDescription - Descripción legible.
 * @param status - Código HTTP (400 por defecto, 401 para `invalid_client`).
 * @returns La respuesta de error.
 */
export function oauthError(error: string, errorDescription: string, status = 400): Response {
  return Response.json(
    { error, error_description: errorDescription },
    { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

/**
 * Respuesta OAuth de éxito sin caché.
 * @param body - Cuerpo JSON (token, metadatos o registro).
 * @param status - Código HTTP.
 * @returns La respuesta de éxito.
 */
export function oauthJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}

/**
 * Credenciales de cliente desde cabecera Basic o del cuerpo del formulario.
 * @param request - Petición entrante.
 * @param form - Parámetros del formulario.
 * @returns `client_id` y `client_secret`, o `null` si no autentican.
 */
export function clientCredentialsFrom(
  request: Request,
  form: URLSearchParams,
): { clientId: string; clientSecret: string } | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("basic ")) {
    try {
      const decoded = atob(header.slice(6).trim());
      const separator = decoded.indexOf(":");
      if (separator > 0) {
        return { clientId: decodeURIComponent(decoded.slice(0, separator)), clientSecret: decodeURIComponent(decoded.slice(separator + 1)) };
      }
    } catch {
      return null;
    }
  }
  const clientId = form.get("client_id");
  const clientSecret = form.get("client_secret");
  if (clientId && clientSecret) return { clientId, clientSecret };
  return null;
}

/**
 * Error del servicio a respuesta HTTP.
 * @param error - Error del servicio.
 * @param status - Código HTTP.
 * @returns La respuesta de error.
 */
export function oauthServiceError(error: OAuthError, status = 400): Response {
  return oauthError(error.error, error.error_description, error.error === "invalid_client" ? 401 : status);
}

/**
 * Respuesta de error 503 cuando el binding D1 no está disponible.
 * @returns La respuesta 503.
 */
export function databaseUnavailable(): Response {
  return oauthError("server_error", "Base de datos no disponible.", 503);
}
