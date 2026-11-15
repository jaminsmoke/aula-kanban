import { getD1 } from "../../../db";
import { clientCredentialsFrom, databaseUnavailable, oauthError, oauthJson, oauthServiceError } from "../../../lib/server/oauth/http";
import { exchangeAuthorizationCode, refreshAccessToken } from "../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Endpoint de token OAuth (RFC 6749 §4.1.3 y §6).
 *
 * Acepta `authorization_code` con PKCE S256 y `refresh_token` con rotación.
 * Como el MCP, es un endpoint «Authorization-only»: no usa cookies y por
 * tanto no aplica CSRF; no se toca la guarda de mismo origen del navegador.
 */

/**
 * Canjea un código o rota un refresco y emite el par de tokens.
 * @param request - Petición `application/x-www-form-urlencoded`.
 * @returns 200 con el par de tokens, o el error OAuth (RFC 6749 §5.2).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return oauthError("temporarily_unavailable", "OAuth experimental no disponible.", 503);
  let db;
  try {
    db = getD1();
  } catch {
    return databaseUnavailable();
  }
  const form = new URLSearchParams(await request.text());
  const grantType = form.get("grant_type");
  const credentials = clientCredentialsFrom(request, form);
  if (!credentials) {
    return oauthError("invalid_client", "Faltan las credenciales de cliente.", 401);
  }

  if (grantType === "authorization_code") {
    const code = form.get("code");
    const verifier = form.get("code_verifier");
    if (!code || !verifier) {
      return oauthError("invalid_request", "Se necesitan `code` y `code_verifier` (PKCE).");
    }
    const exchanged = await exchangeAuthorizationCode(db, {
      code,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      codeVerifier: verifier,
      redirectUri: form.get("redirect_uri") ?? undefined,
    });
    if (!exchanged.ok) return oauthServiceError(exchanged.error);
    return oauthJson(exchanged.tokens);
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (!refreshToken) return oauthError("invalid_request", "Falta `refresh_token`.");
    const refreshed = await refreshAccessToken(db, {
      refreshToken,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      scope: form.get("scope") ?? undefined,
    });
    if (!refreshed.ok) return oauthServiceError(refreshed.error);
    return oauthJson(refreshed.tokens);
  }

  return oauthError("unsupported_grant_type", "Solo authorization_code y refresh_token.");
}
