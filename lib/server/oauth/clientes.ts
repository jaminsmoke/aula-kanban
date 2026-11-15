import { ALL_SCOPES, type Db, type OAuthClient, type OAuthError } from "./types";
import { constantTimeEqual, hashWithSalt, isValidRedirectUri, newSecretMaterial, normalizeScopes } from "./cripto";

/**
 * Registra un cliente (RFC 7591) y devuelve sus credenciales una sola vez.
 * @param db - Base D1.
 * @param input - `redirect_uris`, `scope` y `client_name` solicitados.
 * @returns Las credenciales del cliente o el error OAuth del registro.
 */
export async function registerClient(
  db: Db,
  input: { redirectUris: unknown; scope?: unknown; clientName?: unknown },
): Promise<{ ok: true; client: OAuthClient; clientSecret: string; scopes: string } | { ok: false; error: OAuthError }> {
  const redirectUris = Array.isArray(input.redirectUris) ? input.redirectUris.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  if (!redirectUris.length || redirectUris.some((uri) => !isValidRedirectUri(uri))) {
    return { ok: false, error: { error: "invalid_redirect_uri", error_description: "Cada redirect_uri debe ser https (o http en loopback), sin userinfo ni fragmento." } };
  }
  const requestedScope = typeof input.scope === "string" ? normalizeScopes(input.scope) : null;
  const scopes = requestedScope === null ? ALL_SCOPES : requestedScope;
  if (typeof input.scope === "string" && input.scope.trim() && !scopes) {
    return { ok: false, error: { error: "invalid_scope", error_description: "Ámbitos no soportados: usa mcp:read y/o mcp:write." } };
  }
  const clientName = typeof input.clientName === "string" ? input.clientName.slice(0, 120) : "";
  const material = newSecretMaterial();
  await db
    .prepare(
      `INSERT INTO oauth_clients (client_id, client_secret_hash, client_secret_salt, client_name, redirect_uris, scopes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(material.id, await hashWithSalt(material.salt, material.secret), material.salt, clientName, JSON.stringify(redirectUris), scopes, Date.now())
    .run();
  return { ok: true, client: { clientId: material.id, redirectUris, scopes: scopes.split(" "), clientName }, clientSecret: material.secret, scopes };
}

/**
 * Busca un cliente por su `client_id`.
 * @param db - Base D1.
 * @param clientId - Identificador del cliente.
 * @returns El cliente o `null` si no está registrado.
 */
export async function getClient(db: Db, clientId: string): Promise<OAuthClient | null> {
  const row = await db
    .prepare(`SELECT client_id, client_name, redirect_uris, scopes FROM oauth_clients WHERE client_id = ?`)
    .bind(clientId)
    .first<{ client_id: string; client_name: string; redirect_uris: string; scopes: string }>();
  if (!row) return null;
  let redirectUris: string[] = [];
  try {
    redirectUris = JSON.parse(row.redirect_uris) as string[];
  } catch {
    redirectUris = [];
  }
  return { clientId: row.client_id, redirectUris, scopes: row.scopes.split(" ").filter(Boolean), clientName: row.client_name };
}

/**
 * Autentica un cliente con su `client_id` y `client_secret`.
 * @param db - Base D1.
 * @param clientId - Identificador del cliente.
 * @param clientSecret - Secreto del cliente en claro.
 * @returns El cliente o `null` si las credenciales no coinciden.
 */
export async function authenticateClient(db: Db, clientId: string, clientSecret: string): Promise<OAuthClient | null> {
  const row = await db
    .prepare(`SELECT client_secret_hash, client_secret_salt FROM oauth_clients WHERE client_id = ?`)
    .bind(clientId)
    .first<{ client_secret_hash: string; client_secret_salt: string }>();
  if (!row) return null;
  if (!constantTimeEqual(await hashWithSalt(row.client_secret_salt, clientSecret), row.client_secret_hash)) return null;
  return getClient(db, clientId);
}
