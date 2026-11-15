import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ getD1: () => ({}), getDb: () => ({}) }));
vi.mock("../../../lib/server/mcp/registro", () => ({ registerTools: (server: { registerTool: (name: string, config: unknown, cb: () => unknown) => void }) => {
  const reads = ["listar_proyectos", "listar_tareas", "obtener_tarea", "listar_alumnos", "listar_profesores"];
  for (const name of ["listar_proyectos", "listar_tareas", "obtener_tarea", "crear_tarea", "actualizar_tarea", "eliminar_tarea", "listar_alumnos", "listar_profesores"]) {
    server.registerTool(name, { title: name, description: name, inputSchema: {}, annotations: {} }, async () => ({ content: [{ type: "text", text: JSON.stringify(reads.includes(name) ? { proyectos: [] } : { tarea: {} }) }] }));
  }
}, registrarRecursosUi: () => {}, MCP_CATALOG_VERSION: "0.22.0" }));
vi.mock("../../../lib/server/mcp/auth", () => {
  const READ = new Set(["listar_proyectos", "listar_tareas", "obtener_tarea", "listar_alumnos", "listar_profesores"]);
  const WRITE = new Set(["crear_tarea", "actualizar_tarea", "eliminar_tarea"]);
  const principal = (token: string) => {
    if (token === "ak_mcp_valido") return { userId: "u1", email: "docente@example.com", clientId: "t1", tokenId: "t1", scopes: ["mcp:read", "mcp:write"], via: "personal" as const };
    if (token === "ak_oauth_solo-lectura") return { userId: "u1", email: "docente@example.com", clientId: "c1", tokenId: "at1", scopes: ["mcp:read"], via: "oauth" as const };
    if (token === "ak_oauth_solo-escritura") return { userId: "u1", email: "docente@example.com", clientId: "c1", tokenId: "at2", scopes: ["mcp:write"], via: "oauth" as const };
    return null;
  };
  return {
    authenticateMcp: async (_db: unknown, token: string) => principal(token),
    bearerTokenFromRequest: (request: Request) => {
      const header = request.headers.get("authorization");
      return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
    },
    scopeForTool: (name: string) => (WRITE.has(name) ? "mcp:write" : READ.has(name) ? "mcp:read" : null),
    hasScope: (scopes: string[], scope: string) => scopes.includes(scope),
  };
});

import { GET, POST } from "./route";
import { MCP_INSTRUCTIONS } from "../../../lib/server/mcp/instrucciones";
import { clearMcpRateLimits, MCP_RATE_MAX } from "../../../lib/server/mcp/rate-limit";

const rpc = (method: string, extra: Record<string, unknown> = {}, token?: string) =>
  new Request("https://site.test/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: extra }),
  });

describe("endpoint MCP", () => {
  beforeEach(() => {
    clearMcpRateLimits();
  });

  it("responde 401 sin token y con token inválido", async () => {
    const anonymous = await POST(rpc("initialize"));
    expect(anonymous.status).toBe(401);

    const invalid = await POST(
      rpc(
        "initialize",
        { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
        "ak_mcp_otro",
      ),
    );
    expect(invalid.status).toBe(401);
    expect(invalid.headers.get("www-authenticate")).toContain("Bearer");
  });

  it("el 401 lleva resource_metadata al documento del recurso protegido", async () => {
    const anonymous = await POST(rpc("initialize"));
    const challenge = anonymous.headers.get("www-authenticate") ?? "";
    expect(challenge).toContain('resource_metadata="https://site.test/.well-known/oauth-protected-resource/mcp"');
  });

  it("un token OAuth de solo lectura lee pero no escribe (403 insufficient_scope)", async () => {
    const list = await POST(rpc("tools/list", {}, "ak_oauth_solo-lectura"));
    expect(list.status).toBe(200);

    const read = await POST(rpc("tools/call", { name: "listar_proyectos", arguments: {} }, "ak_oauth_solo-lectura"));
    expect(read.status).toBe(200);

    const write = await POST(
      rpc("tools/call", {
        name: "crear_tarea",
        arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", titulo: "Tarea de prueba", prioridad: "normal", estado: "pending" },
      }, "ak_oauth_solo-lectura"),
    );
    expect(write.status).toBe(403);
    const challenge = write.headers.get("www-authenticate") ?? "";
    expect(challenge).toContain('error="insufficient_scope"');
    expect(challenge).toContain('scope="mcp:write"');
    expect(challenge).toContain('resource_metadata="https://site.test/.well-known/oauth-protected-resource/mcp"');
  });

  it("un token OAuth de solo escritura no lee (403 scope mcp:read)", async () => {
    const read = await POST(rpc("tools/call", { name: "listar_proyectos", arguments: {} }, "ak_oauth_solo-escritura"));
    expect(read.status).toBe(403);
    expect(read.headers.get("www-authenticate") ?? "").toContain('scope="mcp:read"');

    const write = await POST(
      rpc("tools/call", {
        name: "crear_tarea",
        arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", titulo: "Tarea de prueba", prioridad: "normal", estado: "pending" },
      }, "ak_oauth_solo-escritura"),
    );
    expect(write.status).toBe(200);
  });

  it("rechaza lotes que mezclen lectura y escritura", async () => {
    const response = await POST(new Request("https://site.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer ak_oauth_solo-lectura" },
      body: JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "listar_proyectos", arguments: {} } },
        { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "crear_tarea", arguments: {} } },
      ]),
    }));
    expect(response.status).toBe(400);
  });

  it("negocia initialize y lista las 8 herramientas del contrato", async () => {
    const init = await POST(
      rpc(
        "initialize",
        { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
        "ak_mcp_valido",
      ),
    );
    expect(init.status).toBe(200);
    expect(init.headers.get("mcp-session-id")).toBeNull();
    const initBody = (await init.json()) as { result: { serverInfo: { name: string; version: string }; capabilities: Record<string, unknown>; instructions: string } };
    expect(initBody.result.serverInfo).toEqual({ name: "aula-kanban", version: "0.22.0" });
    expect(initBody.result.capabilities).toHaveProperty("prompts");
    expect(initBody.result.instructions).toBe(MCP_INSTRUCTIONS);

    const list = await POST(rpc("tools/list", {}, "ak_mcp_valido"));
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { result: { tools: Array<{ name: string }> } };
    expect(listBody.result.tools.map((tool) => tool.name)).toEqual([
      "listar_proyectos",
      "listar_tareas",
      "obtener_tarea",
      "crear_tarea",
      "actualizar_tarea",
      "eliminar_tarea",
      "listar_alumnos",
      "listar_profesores",
    ]);

    const prompts = await POST(rpc("prompts/list", {}, "ak_mcp_valido"));
    expect(prompts.status).toBe(200);
    const promptsBody = (await prompts.json()) as { result: { prompts: Array<{ name: string }> } };
    expect(promptsBody.result.prompts.map((prompt) => prompt.name)).toEqual(["resumen_de_clase", "planificar_semana", "alta_de_alumnado", "instalar_apps_del_aula"]);

    const prompt = await POST(rpc("prompts/get", { name: "resumen_de_clase", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } }, "ak_mcp_valido"));
    expect(prompt.status).toBe(200);
    const promptBody = (await prompt.json()) as { result: { messages: Array<{ content: { text: string } }> } };
    expect(promptBody.result.messages[0].content.text).toContain("obtener_resumen_proyecto");
  });

  it("la llamada a una herramienta de lectura usa el manejador registrado", async () => {
    const call = await POST(rpc("tools/call", { name: "listar_proyectos", arguments: {} }, "ak_mcp_valido"));
    expect(call.status).toBe(200);
    const body = (await call.json()) as { result: { content: Array<{ text: string }> } };
    expect(body.result.content[0].text).toContain("proyectos");
  });

  it("la llamada a una herramienta de escritura usa su manejador registrado", async () => {
    const call = await POST(rpc("tools/call", {
      name: "crear_tarea",
      arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", titulo: "Tarea de prueba", prioridad: "normal", estado: "pending" },
    }, "ak_mcp_valido"));
    expect(call.status).toBe(200);
    const body = (await call.json()) as { result: { isError: boolean; content: Array<{ text: string }> } };
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0].text).toContain("tarea");
  });

  it("responde 429 cuando el token supera el límite de peticiones", async () => {
    const init = { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } };
    let last: Response | null = null;
    for (let index = 0; index < MCP_RATE_MAX + 1; index += 1) {
      last = await POST(rpc("initialize", init, "ak_mcp_valido"));
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("retry-after")).toBe("60");
  });

  it("otros métodos reciben 405", async () => {
    expect((await GET()).status).toBe(405);
  });
});
