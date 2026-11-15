import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getD1 } from "../../../db";
import { authenticateMcp, bearerTokenFromRequest, hasScope, scopeForTool, type McpScope } from "../../../lib/server/mcp/auth";
import { MCP_INSTRUCTIONS } from "../../../lib/server/mcp/instrucciones";
import { registerPrompts } from "../../../lib/server/mcp/prompts";
import { MCP_CATALOG_VERSION, registerTools, registrarRecursosUi } from "../../../lib/server/mcp/registro";
import { checkMcpRateLimit } from "../../../lib/server/mcp/rate-limit";

export const dynamic = "force-dynamic";

const SERVER_NAME = "aula-kanban";
const SERVER_VERSION = MCP_CATALOG_VERSION;

/**
 * Servidor MCP remoto de Aula Kanban.
 *
 * Transporte HTTP Streamable web-standard, sin sesiones y con respuestas JSON
 * (no SSE): la producción es remota, así que cada petición se autentica con
 * el token que el cliente tenga — el token personal `ak_mcp_…` (cuenta
 * completa) o un token OAuth `ak_oauth_…` (con sus alcances) — y no hay nada
 * que instalar en el cliente. Al autenticar se aplica también un límite
 * básico de peticiones por token.
 */

/**
 * URL de los metadatos del recurso protegido (RFC 9728), para el desafío.
 * @param request - Petición entrante (su origen construye la URL).
 * @returns La URL absoluta de `/.well-known/oauth-protected-resource/mcp`.
 */
function resourceMetadataUrl(request: Request): string {
  return new URL("/.well-known/oauth-protected-resource/mcp", request.url).toString();
}

/**
 * Desafío `WWW-Authenticate` del MCP: Bearer con `resource_metadata`, para
 * que el cliente descubra el servidor de autorización del Site (Fase 2).
 * @param request - Petición entrante.
 * @param attributes - Atributos extra del desafío (`error`, `scope`).
 * @returns El valor de la cabecera `WWW-Authenticate`.
 */
function bearerChallenge(request: Request, attributes: Record<string, string> = {}): string {
  const parts = ['Bearer realm="aula-kanban"', `resource_metadata="${resourceMetadataUrl(request)}"`];
  for (const [key, value] of Object.entries(attributes)) parts.push(`${key}="${value}"`);
  return parts.join(", ");
}

/**
 * Respuesta 401 para peticiones sin token válido.
 * @param request - Petición entrante (para el desafío).
 * @returns 401 con cabecera `WWW-Authenticate` y `resource_metadata`.
 */
function unauthorized(request: Request): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "www-authenticate": bearerChallenge(request) } },
  );
}

/**
 * Respuesta 403 cuando el alcance del token no alcanza para la herramienta.
 * @param request - Petición entrante (para el desafío).
 * @param scope - Alcance exigido por la herramienta (`mcp:read`/`mcp:write`).
 * @returns 403 con `error="insufficient_scope"` y el alcance exigido.
 */
function insufficientScope(request: Request, scope: McpScope): Response {
  return Response.json(
    { error: "insufficient_scope" },
    { status: 403, headers: { "www-authenticate": bearerChallenge(request, { error: "insufficient_scope", scope }) } },
  );
}

type JsonRpcCall = { method?: unknown; params?: { name?: unknown } };

/**
 * Alcance exigido por las llamadas `tools/call` de un cuerpo JSON-RPC
 * (objeto o lote), o `null` si ninguna exige un alcance específico.
 * @param body - Cuerpo ya parseado de la petición.
 * @returns El alcance exigido (`mcp:read`/`mcp:write`) o `null`.
 */
function requiredScopeForBody(body: unknown): McpScope | null {
  const calls: JsonRpcCall[] = [body as JsonRpcCall];
  for (const call of calls) {
    if (call.method !== "tools/call") continue;
    const name = call.params?.name;
    if (typeof name !== "string") continue;
    const required = scopeForTool(name);
    if (required) return required;
  }
  return null;
}

/**
 * Atiende una petición JSON-RPC del MCP autenticando su token.
 * @param request - Petición HTTP del cliente MCP.
 * @returns La respuesta del transporte, o 401/403/429/503.
 */
async function POST(request: Request) {
  const token = bearerTokenFromRequest(request);
  if (!token) return unauthorized(request);
  let db;
  try {
    db = getD1();
  } catch {
    return Response.json({ error: "database_unavailable" }, { status: 503 });
  }
  const expectedResource = new URL("/api/mcp", request.url).toString();
  const principal = await authenticateMcp(db, token, expectedResource);
  if (!principal) return unauthorized(request);
  if (!checkMcpRateLimit(`${principal.via}:${principal.tokenId}`)) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  // El alcance se comprueba antes de despachar: cada herramienta exige el
  // suyo y el 403 lleva el desafío con el alcance que falta. Las llamadas
  // que no son `tools/call` (initialize, tools/list, notificaciones) solo
  // necesitan un token válido.
  let body: unknown = null;
  try {
    body = await request.clone().json();
  } catch {
    body = null;
  }
  // El transporte es sin sesiones y no admite lotes: no permitir que una
  // primera llamada de lectura oculte una escritura con otro alcance.
  if (Array.isArray(body)) return Response.json({ error: "batch_not_supported" }, { status: 400 });
  const requiredScope = body ? requiredScopeForBody(body) : null;
  if (requiredScope && !hasScope(principal.scopes, requiredScope)) {
    return insufficientScope(request, requiredScope);
  }

  // La capacidad de prompts se anuncia ya para que el cliente sepa que
  // puede pedirlos; la lista estará vacía hasta que lleguen los de MCP-11.
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: MCP_INSTRUCTIONS, capabilities: { prompts: {} } },
  );
  registerTools(server);
  registerPrompts(server);
  registrarRecursosUi(server);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request, {
    authInfo: { token, clientId: principal.clientId, scopes: principal.scopes, extra: { userId: principal.userId, email: principal.email, tokenId: principal.tokenId, via: principal.via, clientId: principal.clientId, origen: new URL(request.url).origin } },
  });
  await server.close();
  return response;
}

/**
 * Respuesta para GET/DELETE: en modo sin sesiones no hay streaming.
 * @returns 405 con error JSON.
 */
async function notAllowed() {
  return Response.json({ error: "method_not_allowed" }, { status: 405 });
}

export { POST, notAllowed as GET, notAllowed as DELETE };
