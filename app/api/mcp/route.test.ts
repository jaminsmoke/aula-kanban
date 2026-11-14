import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: null as { userId: string; email: string; tokenId: string } | null }));

vi.mock("../../../db", () => ({ getD1: () => ({}), getDb: () => ({}) }));
vi.mock("../../../lib/server/mcp/reads", () => ({ registerReadTools: (server: { tool: (name: string, description: string, schema: unknown, cb: () => unknown) => void }) => {
  for (const name of ["listar_proyectos", "listar_tareas", "obtener_tarea", "listar_alumnos", "listar_profesores"]) {
    server.tool(name, name, {}, async () => ({ content: [{ type: "text", text: JSON.stringify({ proyectos: [] }) }] }));
  }
} }));
vi.mock("../../../lib/server/mcp/writes", () => ({ registerWriteTools: (server: { tool: (name: string, description: string, schema: unknown, cb: () => unknown) => void }) => {
  for (const name of ["crear_tarea", "actualizar_tarea", "eliminar_tarea"]) {
    server.tool(name, name, {}, async () => ({ content: [{ type: "text", text: JSON.stringify({ tarea: {} }) }] }));
  }
} }));
vi.mock("../../../lib/server/mcp/tokens", () => ({
  authenticateMcpToken: async () => mocks.auth,
  bearerTokenFromRequest: (request: Request) => {
    const header = request.headers.get("authorization");
    return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  },
}));

import { GET, POST } from "./route";
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
    mocks.auth = { userId: "u1", email: "docente@example.com", tokenId: "t1" };
    clearMcpRateLimits();
  });

  it("responde 401 sin token y con token inválido", async () => {
    const anonymous = await POST(rpc("initialize"));
    expect(anonymous.status).toBe(401);

    mocks.auth = null;
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
    const initBody = (await init.json()) as { result: { serverInfo: { name: string; version: string } } };
    expect(initBody.result.serverInfo).toEqual({ name: "aula-kanban", version: "0.1.0" });

    const list = await POST(rpc("tools/list", {}, "ak_mcp_valido"));
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { result: { tools: Array<{ name: string }> } };
    expect(listBody.result.tools.map((tool) => tool.name)).toEqual([
      "listar_proyectos",
      "listar_tareas",
      "obtener_tarea",
      "listar_alumnos",
      "listar_profesores",
      "crear_tarea",
      "actualizar_tarea",
      "eliminar_tarea",
    ]);
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
