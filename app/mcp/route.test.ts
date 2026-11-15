import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: null as null | { userId: string; email: string }, handler: vi.fn() }));
vi.mock("../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../lib/server/mcp/registro", async () => {
  const { z } = await import("zod");
  const tool = { name: "listar_proyectos", description: "Lista proyectos", inputSchema: { proyectoId: z.string().optional() }, outputSchema: {}, annotations: {}, handler: mocks.handler };
  return {
    pluginCatalog: () => new Map([[tool.name, tool]]),
    toolsListEntries: () => [{ name: tool.name, title: "Listar proyectos", description: "Lista proyectos", inputSchema: tool.inputSchema, outputSchema: {}, annotations: {} }],
    MCP_CATALOG_VERSION: "0.25.0",
  };
});
import { POST } from "./route";

function request(method: string, params: unknown = {}) {
  return new Request("https://example.test/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
}

describe("plugin MCP de Sites", () => {
  beforeEach(() => { mocks.user = null; mocks.handler.mockReset().mockResolvedValue({ content: [{ type: "text", text: "ok" }] }); });
  it("anuncia protocolo, instrucciones, capacidades y esquema de herramientas", async () => {
    const discovery = await (await POST(request("server/discover"))).json() as { result: { supportedVersions: string[]; capabilities: Record<string, unknown>; instructions: string } };
    expect(discovery.result.supportedVersions).toContain("2026-07-28");
    expect(discovery.result.capabilities).toHaveProperty("prompts");
    expect(discovery.result.instructions).toContain("quien_soy");
    const init = await (await POST(request("initialize", { protocolVersion: "2026-07-28" }))).json() as { result: { serverInfo: { name: string; version: string }; instructions: string } };
    expect(init.result.serverInfo).toEqual({ name: "aula-kanban", version: "0.25.0" });
    expect(init.result.instructions).toBe(discovery.result.instructions);
    const prompts = await (await POST(request("prompts/list"))).json() as { result: { prompts: Array<{ name: string }> } };
    expect(prompts.result.prompts.map((prompt) => prompt.name)).toEqual(["resumen_de_clase", "planificar_semana", "alta_de_alumnado", "instalar_apps_del_aula"]);
    const prompt = await (await POST(request("prompts/get", { name: "resumen_de_clase", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } }))).json() as { result: { messages: Array<{ content: { text: string } }> } };
    expect(prompt.result.messages[0].content.text).toContain("obtener_resumen_proyecto");
    const missing = await (await POST(request("prompts/get", { name: "resumen_de_clase" }))).json() as { error: { code: number } };
    expect(missing.error.code).toBe(-32602);
    const result = await (await POST(request("tools/list"))).json() as { result: { tools: Array<{ inputSchema: { type: string } }> } };
    expect(result.result.tools[0].inputSchema.type).toBe("object");
  });
  it("rechaza un prompt desconocido", async () => {
    const prompt = await (await POST(request("prompts/get", { name: "inexistente" }))).json() as { error: { code: number } };
    expect(prompt.error.code).toBe(-32602);
  });
  it("sirve el recurso ui:// de apertura y rechaza URIs desconocidas", async () => {
    const lista = await (await POST(request("resources/list"))).json() as { result: { resources: Array<{ uri: string; mimeType: string }> } };
    expect(lista.result.resources[0].uri).toBe("ui://aula-espacio/apertura");
    expect(lista.result.resources[0].mimeType).toBe("text/html;profile=mcp-app");
    const leido = await (await POST(request("resources/read", { uri: "ui://aula-espacio/apertura" }))).json() as { result: { contents: Array<{ mimeType: string; text: string }> } };
    expect(leido.result.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect(leido.result.contents[0].text).toContain("ui/notifications/tool-result");
    const desconocido = await (await POST(request("resources/read", { uri: "ui://inexistente" }))).json() as { error: { code: number } };
    expect(desconocido.error.code).toBe(-32002);
  });
  it("rechaza llamadas sin identidad y valida argumentos", async () => {
    expect((await POST(request("tools/call", { name: "listar_proyectos" }))).status).toBe(401);
    mocks.user = { userId: "u1", email: "user@example.com" };
    const invalid = await (await POST(request("tools/call", { name: "listar_proyectos", arguments: { proyectoId: 4 } }))).json() as { error: { code: number } };
    expect(invalid.error.code).toBe(-32602);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it("entrega al manejador la identidad de la sesión, no la aportada en los argumentos", async () => {
    mocks.user = { userId: "u1", email: "user@example.com" };
    const result = await POST(request("tools/call", { name: "listar_proyectos", arguments: { userId: "attacker" } }));
    expect(result.status).toBe(200);
    expect(mocks.handler).toHaveBeenCalledWith({}, { authInfo: { extra: { userId: "u1", email: "user@example.com", via: "plugin", origen: "https://example.test" } } });
  });
});
