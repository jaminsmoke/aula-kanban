/**
 * Verificador unificado de tokens del servidor MCP (roadmap OAuth, Fase 2).
 *
 * Acepta los dos tokens que el MCP puede recibir en `Authorization: Bearer`:
 *
 * - el **token personal** `ak_mcp_…` (v1): cuenta completa, con los dos
 *   alcances sin recorte, como siempre;
 * - el **token OAuth** `ak_oauth_…` (AS del propio Site): con los alcances
 *   `mcp:read`/`mcp:write` concedidos en el consentimiento y ligados al
 *   recurso (`resource`) que se autorizó.
 *
 * El formato de cada uno empieza por su prefijo, así que no hay ambigüedad:
 * `ak_oauth_` va al verificador OAuth y el resto, al token personal.
 */

import { ALL_SCOPES, verifyAccessToken, type Db } from "../oauth/service";
import { authenticateMcpToken, bearerTokenFromRequest } from "./tokens";
import { READ_TOOL_NAMES, WRITE_TOOL_NAMES } from "./registro";

export { bearerTokenFromRequest };

/** Alcances OAuth que reconoce el MCP. */
export type McpScope = "mcp:read" | "mcp:write";

/** Cuenta autenticada en el MCP, con sus alcances efectivos. */
export type McpPrincipal = {
  userId: string;
  email: string;
  /** Cliente OAuth o token personal, para la identidad del `authInfo`. */
  clientId: string;
  /** Identificador del token (para el límite de peticiones). */
  tokenId: string;
  /** `mcp:read` y/o `mcp:write`; el token personal lleva los dos. */
  scopes: McpScope[];
  via: "personal" | "oauth";
};

/**
 * Normaliza una URL de recurso para compararla: sin barra final.
 * @param value - URL de recurso.
 * @returns La URL sin barras finales.
 */
function normalizeResource(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Autentica un token Bearer como principal del MCP (personal u OAuth).
 * @param db - Base D1 (o adaptador de test).
 * @param token - Token en claro recibido en `Authorization: Bearer`.
 * @param expectedResource - `resource` del propio MCP (`origen + /api/mcp`).
 * @returns La cuenta con sus alcances, o `null` si no autentica.
 */
export async function authenticateMcp(db: Db, token: string, expectedResource: string): Promise<McpPrincipal | null> {
  const secret = token.trim();
  if (secret.startsWith("ak_oauth_")) {
    const verified = await verifyAccessToken(db, secret);
    if (!verified) return null;
    if (verified.resource && normalizeResource(verified.resource) !== normalizeResource(expectedResource)) return null;
    const scopes = verified.scope
      .split(" ")
      .filter((scope): scope is McpScope => scope === "mcp:read" || scope === "mcp:write");
    return { userId: verified.userId, email: verified.email, clientId: verified.clientId, tokenId: verified.tokenId, scopes, via: "oauth" };
  }
  const personal = await authenticateMcpToken(db, secret);
  if (!personal) return null;
  return { userId: personal.userId, email: personal.email, clientId: personal.tokenId, tokenId: personal.tokenId, scopes: ALL_SCOPES.split(" ") as McpScope[], via: "personal" };
}

/**
 * Alcance que exige una herramienta, o `null` si no es del contrato.
 * @param name - Nombre de la herramienta de `tools/call`.
 * @returns `mcp:read`, `mcp:write` o `null`.
 */
export function scopeForTool(name: string): McpScope | null {
  if (WRITE_TOOL_NAMES.has(name)) return "mcp:write";
  if (READ_TOOL_NAMES.has(name)) return "mcp:read";
  return null;
}

/**
 * Comprueba si los alcances efectivos incluyen el exigido.
 * @param scopes - Alcances del token verificado.
 * @param scope - Alcance exigido por la herramienta.
 * @returns `true` si el token puede usar la herramienta.
 */
export function hasScope(scopes: McpScope[], scope: McpScope): boolean {
  return scopes.includes(scope);
}
