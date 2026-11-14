import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getD1 } from "../../../db";
import { authenticateMcpToken, bearerTokenFromRequest } from "../../../lib/server/mcp/tokens";
import { registerReadTools } from "../../../lib/server/mcp/reads";
import { registerWriteTools } from "../../../lib/server/mcp/writes";
import { checkMcpRateLimit } from "../../../lib/server/mcp/rate-limit";

export const dynamic = "force-dynamic";

const SERVER_NAME = "aula-kanban";
const SERVER_VERSION = "0.1.0";

/**
 * Servidor MCP remoto de Aula Kanban.
 *
 * Transporte HTTP Streamable web-standard, sin sesiones y con respuestas JSON
 * (no SSE): la producción es remota, así que cada petición se autentica con
 * el token personal y no hay nada que instalar en el cliente. Al autenticar
 * se aplica también un límite básico de peticiones por token.
 */

/**
 * Respuesta 401 para peticiones sin token válido.
 * @returns 401 con cabecera `WWW-Authenticate`.
 */
function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "www-authenticate": 'Bearer realm="aula-kanban"' } },
  );
}

/**
 * Atiende una petición JSON-RPC del MCP autenticando su token.
 * @param request - Petición HTTP del cliente MCP.
 * @returns La respuesta del transporte, o 401/429/503.
 */
async function POST(request: Request) {
  const token = bearerTokenFromRequest(request);
  if (!token) return unauthorized();
  let db;
  try {
    db = getD1();
  } catch {
    return Response.json({ error: "database_unavailable" }, { status: 503 });
  }
  const auth = await authenticateMcpToken(db, token);
  if (!auth) return unauthorized();
  if (!checkMcpRateLimit(auth.tokenId)) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerReadTools(server);
  registerWriteTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request, {
    authInfo: { token, clientId: auth.tokenId, scopes: [], extra: { userId: auth.userId, email: auth.email, tokenId: auth.tokenId } },
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
