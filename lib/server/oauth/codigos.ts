import { CODE_PREFIX, CODE_TTL_MS, type Db, type OAuthError, type OAuthUser } from "./types";
import { hashWithSalt, newSecretMaterial, parsePrefixedToken, verifyPkceS256 } from "./cripto";

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

export type CodeRow = {
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
export async function consumeCode(
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
