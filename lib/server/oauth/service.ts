

/**
 * Servicio del servidor de autorización OAuth (roadmap OAuth 2.1, Fase 1).
 *
 * Los secretos (client_secret, códigos y tokens) solo se guardan como hashes
 * SHA-256 con sal por registro, con el mismo patrón que `mcp_tokens`: el
 * valor completo se muestra una sola vez en el registro o en la respuesta de
 * token. Los tokens son opacos: `ak_oauth_<id>_<secreto>` para acceso y
 * refresco, y `ak_oc_<id>_<secreto>` para el código de autorización.
 */

/** Interface mínima D1 del servicio (igual patrón que `TokenDatabase` en tests). */
export type Db = {
  prepare(sql: string): {
    bind(...params: Array<string | number | bigint | Uint8Array | null>): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta?: { changes?: number } | undefined }>;
    };
  };
  batch(statements: Array<{ run(): Promise<unknown> }>): Promise<unknown[]>;
};

const OAUTH_SCOPES = ["mcp:read", "mcp:write"] as const;
export type OAuthScope = (typeof OAUTH_SCOPES)[number];
export const SUPPORTED_SCOPES = OAUTH_SCOPES.join(" ");
export const ALL_SCOPES = OAUTH_SCOPES.join(" ");

export const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TOKEN_PREFIX = "ak_oauth_";
const CODE_PREFIX = "ak_oc_";
const encoder = new TextEncoder();

/** Error OAuth con el `error` y `error_description` de RFC 6749 §5.2. */
export type OAuthError = { error: string; error_description: string };

export type OAuthUser = { userId: string; email: string };

/** Cliente OAuth registrado (RFC 7591), sin secretos en claro. */
export type OAuthClient = {
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  clientName: string;
};

/** Token verificado con la cuenta, el cliente y el alcance para el resource server. */
export type OAuthAccessToken = OAuthUser & {
  tokenId: string;
  clientId: string;
  scope: string;
  resource: string;
  expiresAt: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

/**
 * Genera bytes aleatorios.
 * @param length - Número de bytes.
 * @returns Los bytes generados.
 */
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Codifica bytes a base64url sin relleno.
 * @param bytes - Bytes de entrada.
 * @returns La cadena base64url.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decodifica base64url a bytes, o `null` si no es válido.
 * @param value - Cadena base64url.
 * @returns Los bytes decodificados o `null`.
 */
export function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Extrae el uuid y el secreto de un token con la forma `prefijo<uuid>_<secreto>`.
 * @param prefix - Prefijo del token.
 * @param token - Token completo.
 * @returns El id y el secreto, o `null` si la forma no coincide.
 */
export function parsePrefixedToken(prefix: string, token: string): { id: string; secret: string } | null {
  if (!token.startsWith(prefix)) return null;
  const rest = token.slice(prefix.length);
  const separator = rest.indexOf("_");
  if (separator <= 0) return null;
  const id = rest.slice(0, separator);
  const secret = rest.slice(separator + 1);
  if (!id || !secret || secret.length > 200) return null;
  return { id, secret };
}

/**
 * Hash SHA-256 de `sal ‖ secreto`, igual que `tokens.ts` de MCP.
 * @param salt - Sal en base64url.
 * @param secret - Secreto en claro.
 * @returns El hash en base64url.
 */
export async function hashWithSalt(salt: string, secret: string): Promise<string> {
  const saltBytes = base64UrlToBytes(salt) ?? new Uint8Array(0);
  const secretBytes = encoder.encode(secret);
  const input = new Uint8Array(saltBytes.length + secretBytes.length);
  input.set(saltBytes);
  input.set(secretBytes, saltBytes.length);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToBase64Url(new Uint8Array(digest));
}

/**
 * Comparación en tiempo constante.
 * @param a - Primera cadena.
 * @param b - Segunda cadena.
 * @returns `true` si son iguales.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  if (bytesA.length !== bytesB.length) return false;
  let difference = 0;
  for (let index = 0; index < bytesA.length; index += 1) {
    difference |= bytesA[index] ^ bytesB[index];
  }
  return difference === 0;
}

/**
 * Material nuevo: uuid de registro, secreto (32 bytes) y sal (16 bytes).
 * @returns El uuid, el secreto y la sal en base64url.
 */
export function newSecretMaterial(): { id: string; secret: string; salt: string } {
  return {
    id: crypto.randomUUID(),
    secret: bytesToBase64Url(randomBytes(32)),
    salt: bytesToBase64Url(randomBytes(16)),
  };
}

/**
 * Normaliza una cadena de ámbitos: sin duplicados, solo los soportados, en orden.
 * @param scope - Ámbitos solicitados separados por espacios.
 * @returns Los ámbitos soportados, en orden canónico.
 */
export function normalizeScopes(scope: string | undefined | null): string {
  const wanted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return OAUTH_SCOPES.filter((supported) => wanted.has(supported)).join(" ");
}

/**
 * URI de redirección válida para un cliente: https, o http solo en loopback,
 * sin userinfo ni fragmento, y sin esquemas peligrosos (RFC 6749 §3.1.2).
 * @param uri - URI candidata.
 * @returns `true` si puede registrarse.
 */
export function isValidRedirectUri(uri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password || parsed.hash) return false;
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "::1" || host.startsWith("127.");
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:" && loopback) return true;
  return false;
}

/**
 * Comprueba PKCE S256 (RFC 7636 §4.2): `BASE64URL(SHA256(verifier)) === challenge`.
 * @param verifier - `code_verifier` del cliente.
 * @param challenge - `code_challenge` de la solicitud de autorización.
 * @returns `true` si el verificador corresponde al reto.
 */
export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return constantTimeEqual(bytesToBase64Url(new Uint8Array(digest)), challenge);
}

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

/**
 * Crea un código de autorización de un solo uso (PKCE S256) para la cuenta.
 * @param db - Base D1.
 * @param input - Cliente, cuenta, redirect URI, reto y alcance del código.
 * @returns El código en claro para llevarlo a la `redirect_uri`.
 */
export async function createAuthorizationCode(
  db: Db,
  input: { clientId: string; user: OAuthUser; redirectUri: string; codeChallenge: string; scope: string; resource?: string },
): Promise<string> {
  const material = newSecretMaterial();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO oauth_authorization_codes (id, client_id, user_id, email, redirect_uri, code_challenge, scope, resource, expires_at, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .bind(await hashWithSalt(material.id, material.secret), input.clientId, input.user.userId, input.user.email, input.redirectUri, input.codeChallenge, input.scope, input.resource ?? "", now + CODE_TTL_MS, now)
    .run();
  return `${CODE_PREFIX}${material.id}_${material.secret}`;
}

type CodeRow = {
  id: string;
  client_id: string;
  user_id: string;
  email: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource: string;
  expires_at: number;
  consumed_at: number | null;
};

/**
 * Consume y valida un código contra el verificador PKCE y la redirección.
 * @param db - Base D1.
 * @param code - Código de autorización en claro.
 * @param clientId - Cliente que canjea.
 * @param codeVerifier - Verificador PKCE del cliente.
 * @param redirectUri - `redirect_uri` usada en el token request, si se envía.
 * @returns La fila del código o el error OAuth.
 */
async function consumeCode(
  db: Db,
  code: string,
  clientId: string,
  codeVerifier: string,
  redirectUri: string | undefined,
): Promise<{ ok: true; row: CodeRow } | { ok: false; error: OAuthError }> {
  const parsed = parsePrefixedToken(CODE_PREFIX, code);
  if (!parsed) return { ok: false, error: { error: "invalid_grant", error_description: "Código de autorización no válido." } };
  const row = await db
    .prepare(`SELECT * FROM oauth_authorization_codes WHERE id = ?`)
    .bind(await hashWithSalt(parsed.id, parsed.secret))
    .first<CodeRow>();
  if (!row || row.client_id !== clientId || row.consumed_at !== null || Date.now() > row.expires_at) {
    return { ok: false, error: { error: "invalid_grant", error_description: "Código expirado, ya usado o de otro cliente." } };
  }
  if (redirectUri !== undefined && redirectUri !== row.redirect_uri) {
    return { ok: false, error: { error: "invalid_grant", error_description: "redirect_uri no coincide con la de la autorización." } };
  }
  if (!codeVerifier || !(await verifyPkceS256(codeVerifier, row.code_challenge))) {
    return { ok: false, error: { error: "invalid_grant", error_description: "PKCE: code_verifier no coincide con code_challenge (S256)." } };
  }
  const claimed = await db.prepare(`UPDATE oauth_authorization_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`).bind(Date.now(), row.id, Date.now()).run();
  if (claimed.meta?.changes !== 1) return { ok: false, error: { error: "invalid_grant", error_description: "Código expirado o ya usado." } };
  return { ok: true, row };
}

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
