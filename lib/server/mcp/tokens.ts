import {
  findTokenRow,
  insertTokenRow,
  listTokenRows,
  revokeTokenRow,
  touchTokenRow,
  type TokenDatabase,
} from "./tokens-repository";

/**
 * Tokens personales del servidor MCP.
 *
 * Formato: `ak_mcp_<uuid>_<secret>`, donde `secret` son 32 bytes aleatorios en
 * base64url. En la tabla (`mcp_tokens`) solo se guarda el SHA-256 del secreto
 * con una sal por token: la fila leída con el uuid permite localizarla sin
 * exponer el secreto, y el hash permite comprobarlo.
 *
 * El servicio conserva el formato, el cifrado y los metadatos públicos; las
 * filas de `mcp_tokens` viven en `tokens-repository.ts`. Los tests le pasan un
 * adaptador de SQLite en memoria sin tocar Cloudflare.
 */

export type { TokenDatabase } from "./tokens-repository";

const TOKEN_PREFIX = "ak_mcp_";

/** Metadatos públicos de un token, sin hash ni sal. */
export type McpTokenMeta = {
  id: string;
  label: string;
  lastUsedAt: number | null;
  createdAt: number;
  revokedAt: number | null;
};

/**
 * Codifica bytes sin signo en base64url.
 * @param bytes - Bytes a codificar.
 * @returns El texto base64url sin relleno `=`.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decodifica base64url a bytes.
 * @param text - Texto base64url.
 * @returns Los bytes decodificados o `null` si el texto no es válido.
 */
function base64UrlToBytes(text: string): Uint8Array | null {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Bytes aleatorios criptográficamente seguros.
 * @param length - Número de bytes.
 * @returns Los bytes aleatorios.
 */
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Genera el identificador y el secreto de un token nuevo.
 * @returns El uuid, el secreto y la sal en base64url.
 */
export function newTokenMaterial(): { id: string; secret: string; salt: string } {
  return {
    id: crypto.randomUUID(),
    secret: bytesToBase64Url(randomBytes(32)),
    salt: bytesToBase64Url(randomBytes(16)),
  };
}

const encoder = new TextEncoder();

/**
 * SHA-256 de la sal junto con el secreto, en base64url.
 * @param salt - Sal en base64url.
 * @param secret - Secreto en claro.
 * @returns El hash en base64url.
 */
export async function hashSecret(salt: string, secret: string): Promise<string> {
  const saltBytes = base64UrlToBytes(salt) ?? new Uint8Array(0);
  const secretBytes = encoder.encode(secret);
  const input = new Uint8Array(saltBytes.length + secretBytes.length);
  input.set(saltBytes);
  input.set(secretBytes, saltBytes.length);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToBase64Url(new Uint8Array(digest));
}

/**
 * Comparación de hashes en tiempo constante sobre los bytes decodificados.
 * @param a - Hash en base64url.
 * @param b - Hash en base64url.
 * @returns `true` si coinciden byte a byte.
 */
function equalTexts(a: string, b: string): boolean {
  const bytesA = base64UrlToBytes(a);
  const bytesB = base64UrlToBytes(b);
  if (!bytesA || !bytesB || bytesA.length !== bytesB.length) return false;
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

/**
 * Extrae el identificador y el secreto de un token.
 * @param token - Token en claro.
 * @returns El par id/secreto o `null` si no tiene el formato.
 */
export function parseToken(token: string): { id: string; secret: string } | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const rest = token.slice(TOKEN_PREFIX.length);
  const separator = rest.indexOf("_");
  if (separator <= 0) return null;
  const id = rest.slice(0, separator);
  const secret = rest.slice(separator + 1);
  if (!secret || secret.length > 200) return null;
  return { id, secret };
}

/**
 * Totales completos de un token. Solo el token en texto plano se devuelve
 * una vez; después únicamente su hash quedará en la base.
 * @param db - Base D1 (o adaptador de test).
 * @param userId - Cuenta dueña del token.
 * @param email - Correo de la cuenta al crear el token; se guarda para que el acceso se resuelva igual que con la sesión.
 * @param label - Etiqueta legible elegida por la persona.
 * @returns El token en claro junto con sus metadatos.
 */
export async function createMcpToken(db: TokenDatabase, userId: string, email: string, label: string): Promise<{ id: string; token: string; label: string; createdAt: number }> {
  const { id, secret, salt } = newTokenMaterial();
  const tokenHash = await hashSecret(salt, secret);
  const createdAt = Date.now();
  const cleanLabel = label.trim().slice(0, 80);
  await insertTokenRow(db, { id, userId, email, label: cleanLabel, tokenHash, salt, createdAt });
  return { id, token: `${TOKEN_PREFIX}${id}_${secret}`, label: cleanLabel, createdAt };
}

/**
 * Comprueba un token y registra su último uso.
 * @param db - Base D1 (o adaptador de test).
 * @param token - Token en claro recibido en `Authorization: Bearer`.
 * @returns La cuenta y el token, o `null` si no es válido o está revocado.
 */
export async function authenticateMcpToken(db: TokenDatabase, token: string): Promise<{ userId: string; email: string; tokenId: string } | null> {
  const parsed = parseToken(token.trim());
  if (!parsed) return null;
  const row = await findTokenRow(db, parsed.id);
  if (!row || row.revoked_at !== null) return null;
  const candidate = await hashSecret(row.salt, parsed.secret);
  if (!equalTexts(candidate, row.token_hash)) return null;
  await touchTokenRow(db, parsed.id, Date.now());
  return { userId: row.user_id, email: row.email, tokenId: row.id };
}

/**
 * Lista los tokens de una cuenta, sin hash ni sal, de más reciente a más antiguo.
 * @param db - Base D1 (o adaptador de test).
 * @param userId - Cuenta dueña de los tokens.
 * @returns Los metadatos públicos de cada token.
 */
export async function listMcpTokens(db: TokenDatabase, userId: string): Promise<McpTokenMeta[]> {
  const rows = await listTokenRows(db, userId);
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

/**
 * Revoca un token propio marcando `revoked_at`.
 * @param db - Base D1 (o adaptador de test).
 * @param userId - Cuenta dueña del token.
 * @param id - Identificador del token.
 * @returns `true` si se revocó; `false` si no existe o no es de la cuenta.
 */
export async function revokeMcpToken(db: TokenDatabase, userId: string, id: string): Promise<boolean> {
  return revokeTokenRow(db, userId, id, Date.now());
}

/**
 * Lee el token del encabezado `Authorization: Bearer …` de la petición.
 * @param request - Petición HTTP del cliente MCP.
 * @returns El token en claro o `null`.
 */
export function bearerTokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length).trim();
  return token ? token : null;
}
