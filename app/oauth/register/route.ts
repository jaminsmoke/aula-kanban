import { getD1 } from "../../../db";
import { databaseUnavailable, oauthJson, oauthServiceError } from "../../../lib/server/oauth/http";
import { registerClient } from "../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Registro dinámico de clientes OAuth (RFC 7591).
 *
 * Es la puerta del flujo MCP/GPT: un cliente externo (Cursor, Claude,
 * ChatGPT) se registra aquí y recibe su `client_id` y `client_secret`. Como
 * el MCP, acepta clientes no-navegador sin cookie, así que no aplica la
 * guarda de mismo origen; el cliente todavía no puede hacer nada hasta que
 * la cuenta apruebe el consentimiento en `/oauth/authorize`.
 */

/**
 * Registra un cliente con sus `redirect_uris`, `scope` y `client_name`.
 * @param request - Petición form-urlencoded del cliente externo.
 * @returns 201 con las credenciales una única vez, o el error OAuth.
 */
export async function POST(request: Request) {
  // OAuth externo sigue en revisión. Producción aún no tiene clientes OAuth;
  // bloquear nuevas altas impide activar esta vía hasta completar la revisión.
  if (process.env.NODE_ENV === "production") return oauthServiceError({ error: "temporarily_unavailable", error_description: "El registro OAuth experimental no está disponible." }, 503);
  let db;
  try {
    db = getD1();
  } catch {
    return databaseUnavailable();
  }
  const text = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // La mayoría de clientes MCP envía JSON; se acepta el formulario por si acaso.
    body = Object.fromEntries(new URLSearchParams(text));
  }
  const jsonBody = body as Record<string, unknown>;
  const registered = await registerClient(db, {
    redirectUris: jsonBody.redirect_uris,
    scope: jsonBody.scope,
    clientName: jsonBody.client_name,
  });
  if (!registered.ok) return oauthServiceError(registered.error, 400);
  const redirectUris = registered.client.redirectUris;
  return oauthJson(
    {
      client_id: registered.client.clientId,
      client_secret: registered.clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
      scope: registered.scopes,
      client_name: registered.client.clientName,
    },
    201,
  );
}
