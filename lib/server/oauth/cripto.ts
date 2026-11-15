import { OAUTH_SCOPES } from "./types";

const encoder = new TextEncoder();

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
