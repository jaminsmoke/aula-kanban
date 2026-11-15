import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getChatGPTUser } from "../../lib/server/auth";
import { promptByName, promptListEntries } from "../../lib/domain/mcp-prompts";
import { MCP_INSTRUCTIONS } from "../../lib/server/mcp/instrucciones";
import { MCP_CATALOG_VERSION, pluginCatalog, toolsListEntries } from "../../lib/server/mcp/registro";
import { leerRecursoUi, listarRecursosUi } from "../../lib/server/mcp/ui-apertura";

export const dynamic = "force-dynamic";

/** Versión del protocolo que habla el plugin de Sites. */
const PROTOCOL_VERSION = "2026-07-28";
/** Capacidades que anuncian las dos puertas. */
const CAPABILITIES = { tools: {}, resources: {}, prompts: {} };

/**
 * Atiende el protocolo del plugin de Sites con la identidad autenticada del visitante.
 * @param request - Petición JSON-RPC recibida por Sites.
 * @returns Respuesta del protocolo o rechazo de la petición.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Petición inválida" } }, { status: 400 });
  const call = body as { id?: string | number | null; method?: string; params?: { name?: string; arguments?: unknown } };
  const id = call.id ?? null;
  const reply = (result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
  const failure = (code: number, message: string) => Response.json({ jsonrpc: "2.0", id, error: { code, message } });
  if (call.method === "server/discover") return reply({ supportedVersions: [PROTOCOL_VERSION], capabilities: CAPABILITIES, instructions: MCP_INSTRUCTIONS });
  if (call.method === "initialize") return reply({ protocolVersion: PROTOCOL_VERSION, capabilities: CAPABILITIES, serverInfo: { name: "aula-kanban", version: MCP_CATALOG_VERSION }, instructions: MCP_INSTRUCTIONS });
  if (call.method === "prompts/list") return reply({ prompts: promptListEntries() });
  if (call.method === "prompts/get") {
    const prompt = promptByName(typeof call.params?.name === "string" ? call.params.name : "");
    if (!prompt) return failure(-32602, "Prompt desconocido");
    const raw = call.params?.arguments;
    const args = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const missing = prompt.arguments.find((argument) => argument.required && (typeof args[argument.name] !== "string" || (args[argument.name] as string).trim() === ""));
    if (missing) return failure(-32602, `Falta el argumento ${missing.name}.`);
    return reply({ description: prompt.description, messages: prompt.messages(args as Record<string, string | undefined>) });
  }
  if (call.method === "tools/list") {
    return reply({
      tools: toolsListEntries().map(({ name, title, description, inputSchema, outputSchema, annotations, _meta }) => ({
        name,
        title,
        description,
        inputSchema: zodToJsonSchema(z.object(inputSchema), { target: "jsonSchema7" }),
        outputSchema: zodToJsonSchema(z.object(outputSchema), { target: "jsonSchema7" }),
        annotations,
        ...(_meta ? { _meta } : {}),
      })),
    });
  }
  if (call.method === "resources/list") return reply({ resources: listarRecursosUi() });
  if (call.method === "resources/read") {
    const uri = typeof (call.params as { uri?: unknown } | undefined)?.uri === "string" ? (call.params as { uri: string }).uri : "";
    const recurso = leerRecursoUi(uri);
    if (!recurso) return failure(-32002, "Recurso no encontrado");
    return reply({ contents: [recurso] });
  }
  if (call.method === "prompts/get") return failure(-32602, "Prompt desconocido");
  if (call.method !== "tools/call") return failure(-32601, "Método desconocido");
  const user = await getChatGPTUser();
  if (!user) return Response.json({ jsonrpc: "2.0", id, error: { code: -32001, message: "Se necesita una sesión autenticada" } }, { status: 401 });
  const tools = pluginCatalog();
  const tool = typeof call.params?.name === "string" ? tools.get(call.params.name) : undefined;
  if (!tool) return failure(-32602, "Herramienta desconocida");
  const args = z.object(tool.inputSchema).safeParse(call.params?.arguments ?? {});
  if (!args.success) return failure(-32602, "Argumentos no válidos");
  try {
    const origen = new URL(request.url).origin;
    return reply(await tool.handler(args.data, { authInfo: { extra: { userId: user.userId, email: user.email, via: "plugin", origen } } }));
  } catch {
    return reply({ content: [{ type: "text", text: "No se pudo completar la operación." }], isError: true });
  }
}
