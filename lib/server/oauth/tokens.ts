import {
  ACCESS_TOKEN_TTL_MS,
  ALL_SCOPES,
  REFRESH_TOKEN_TTL_MS,
  TOKEN_PREFIX,
  type Db,
  type OAuthAccessToken,
  type OAuthError,
  type OAuthUser,
  type TokenResponse,
} from "./types";
import { constantTimeEqual, hashWithSalt, newSecretMaterial, normalizeScopes, parsePrefixedToken } from "./cripto";
import { authenticateClient } from "./clientes";
import { consumeCode } from "./codigos";

/**
 * Crea un par acceso+refresco ligados a la cuenta, el cliente y el alcance.
 * @param db - Base D1.
 * @param input - Cliente, cuenta, alcance y recurso.
 * @returns Los tokens en claro para la respuesta del token.
 */
async function issueTokens(
  db: Db,
  input: { clientId: string; user: OAuthUser; scope: string; resource: string },
): Promise<TokenResponse> {
  const access = newSecretMaterial();
  const refresh = newSecretMaterial();
  const now = Date.now();
  await db
    .batch([
      db
        .prepare(
          `INSERT INTO oauth_access_tokens (id, user_id, email, client_id, token_hash, salt, scope, resource, expires_at, last_used_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
        )
        .bind(access.id, input.user.userId, input.user.email, input.clientId, await hashWithSalt(access.salt, access.secret), access.salt, input.scope, input.resource, now + ACCESS_TOKEN_TTL_MS, now),
      db
        .prepare(
          `INSERT INTO oauth_refresh_tokens (id, user_id, email, client_id, token_hash, salt, scope, resource, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        )
        .bind(refresh.id, input.user.userId, input.user.email, input.clientId, await hashWithSalt(refresh.salt, refresh.secret), refresh.salt, input.scope, input.resource, now + REFRESH_TOKEN_TTL_MS, now),
    ]);
  return {
    access_token: `${TOKEN_PREFIX}${access.id}_${access.secret}`,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_MS / 1000,
    refresh_token: `${TOKEN_PREFIX}${refresh.id}_${refresh.secret}`,
    scope: input.scope,
  };
}

/**
 * Canjea un código de autorización por el par de tokens (grant tipo
 * `authorization_code`, con PKCE S256 obligatorio).
 * @param db - Base D1.
 * @param input - Código, credenciales de cliente, verificador y redirect URI.
 * @returns Los tokens o el error OAuth.
 */
export async function exchangeAuthorizationCode(
  db: Db,
  input: { code: string; clientId: string; clientSecret: string; codeVerifier: string; redirectUri?: string },
): Promise<{ ok: true; tokens: TokenResponse } | { ok: false; error: OAuthError }> {
  const client = await authenticateClient(db, input.clientId, input.clientSecret);
  if (!client) return { ok: false, error: { error: "invalid_client", error_description: "Autenticación de cliente fallida." } };
  const code = await consumeCode(db, input.code, input.clientId, input.codeVerifier, input.redirectUri);
  if (!code.ok) return code;
  const scope = normalizeScopes(code.row.scope) || ALL_SCOPES;
  const tokens = await issueTokens(db, {
    clientId: input.clientId,
    user: { userId: code.row.user_id, email: code.row.email },
    scope,
    resource: code.row.resource,
  });
  return { ok: true, tokens };
}

/**
 * Rota un token de refresco: el anterior se revoca y se emite un par nuevo.
 * @param db - Base D1.
 * @param input - Refresco, credenciales de cliente y alcance opcional.
 * @returns El par nuevo o el error OAuth.
 */
export async function refreshAccessToken(
  db: Db,
  input: { refreshToken: string; clientId: string; clientSecret: string; scope?: string },
): Promise<{ ok: true; tokens: TokenResponse } | { ok: false; error: OAuthError }> {
  const client = await authenticateClient(db, input.clientId, input.clientSecret);
  if (!client) return { ok: false, error: { error: "invalid_client", error_description: "Autenticación de cliente fallida." } };
  const parsed = parsePrefixedToken(TOKEN_PREFIX, input.refreshToken);
  if (!parsed) return { ok: false, error: { error: "invalid_grant", error_description: "Token de refresco no válido." } };
  const row = await db
    .prepare(`SELECT * FROM oauth_refresh_tokens WHERE id = ?`)
    .bind(parsed.id)
    .first<{ user_id: string; email: string; client_id: string; token_hash: string; salt: string; scope: string; resource: string; expires_at: number; revoked_at: number | null }>();
  if (!row || row.client_id !== input.clientId || row.revoked_at !== null || Date.now() > row.expires_at) {
    return { ok: false, error: { error: "invalid_grant", error_description: "Token de refresco expirado, revocado o de otro cliente." } };
  }
  if (!constantTimeEqual(await hashWithSalt(row.salt, parsed.secret), row.token_hash)) {
    return { ok: false, error: { error: "invalid_grant", error_description: "Token de refresco no válido." } };
  }
  const nextScope = input.scope !== undefined ? normalizeScopes(input.scope) : row.scope;
  if (input.scope !== undefined && !nextScope) {
    return { ok: false, error: { error: "invalid_scope", error_description: "Ámbitos no soportados: usa mcp:read y/o mcp:write." } };
  }
  if (nextScope && nextScope.split(" ").some((scope: string) => !row.scope.split(" ").includes(scope))) {
    return { ok: false, error: { error: "invalid_scope", error_description: "El alcance solicitado supera el concedido." } };
  }
  const now = Date.now();
  const claimed = await db.prepare(`UPDATE oauth_refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL AND expires_at > ?`).bind(now, parsed.id, now).run();
  if (claimed.meta?.changes !== 1) return { ok: false, error: { error: "invalid_grant", error_description: "Token de refresco expirado o ya usado." } };
  const tokens = await issueTokens(db, {
    clientId: input.clientId,
    user: { userId: row.user_id, email: row.email },
    scope: nextScope || row.scope,
    resource: row.resource,
  });
  return { ok: true, tokens };
}

/**
 * Verifica un token de acceso para el resource server (Fase 2): caducado,
 * revocado o de otro secreto devuelve `null`, y si es válido registra su
 * `last_used_at` para la revocación visible en cada sesión.
 * @param db - Base D1.
 * @param token - Token de acceso en claro.
 * @returns El token verificado con cuenta, cliente y alcance, o `null`.
 */
export async function verifyAccessToken(db: Db, token: string): Promise<OAuthAccessToken | null> {
  const parsed = parsePrefixedToken(TOKEN_PREFIX, token);
  if (!parsed) return null;
  const row = await db
    .prepare(`SELECT * FROM oauth_access_tokens WHERE id = ?`)
    .bind(parsed.id)
    .first<{ user_id: string; email: string; client_id: string; token_hash: string; salt: string; scope: string; resource: string; expires_at: number; revoked_at: number | null }>();
  if (!row || row.revoked_at !== null || Date.now() > row.expires_at) return null;
  if (!constantTimeEqual(await hashWithSalt(row.salt, parsed.secret), row.token_hash)) return null;
  await db.prepare(`UPDATE oauth_access_tokens SET last_used_at = ? WHERE id = ?`).bind(Date.now(), parsed.id).run();
  return { tokenId: parsed.id, userId: row.user_id, email: row.email, clientId: row.client_id, scope: row.scope, resource: row.resource, expiresAt: row.expires_at };
}

/**
 * Revoca un token de acceso o de refresco (RFC 7009). Sin error si no existe.
 * @param db - Base D1.
 * @param input - Token, pista de tipo y credenciales opcionales de cliente.
 * @returns `true` si se encontró y revocó el token.
 */
export async function revokeToken(db: Db, input: { token: string; tokenTypeHint?: string; clientId?: string; clientSecret?: string }): Promise<boolean> {
  const parsed = parsePrefixedToken(TOKEN_PREFIX, input.token);
  if (!parsed) return false;
  const now = Date.now();
  const candidates: Array<{ table: "oauth_access_tokens" | "oauth_refresh_tokens"; hint: string }> = [
    { table: "oauth_access_tokens", hint: "access_token" },
    { table: "oauth_refresh_tokens", hint: "refresh_token" },
  ];
  const narrowed = input.tokenTypeHint === "refresh_token" ? candidates.slice(1) : input.tokenTypeHint === "access_token" ? candidates.slice(0, 1) : candidates;
  let revoked = false;
  for (const { table } of narrowed) {
    const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(parsed.id).first<{ token_hash: string; salt: string; client_id: string; revoked_at: number | null }>();
    if (!row || row.revoked_at !== null) continue;
    if (!constantTimeEqual(await hashWithSalt(row.salt, parsed.secret), row.token_hash)) continue;
    // Si se autentican las credenciales, el token debe pertenecer a ese cliente.
    if (input.clientId && input.clientSecret) {
      const client = await authenticateClient(db, input.clientId, input.clientSecret);
      if (!client || row.client_id !== input.clientId) continue;
    }
    await db.prepare(`UPDATE ${table} SET revoked_at = ? WHERE id = ?`).bind(now, parsed.id).run();
    revoked = true;
  }
  return revoked;
}
