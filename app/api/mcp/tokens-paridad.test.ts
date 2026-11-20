import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Paridad MCP ↔ HTTP de tokens propios (MCP-09, fase 2): `listar_tokens_mcp`
 * y `revocar_token_mcp` usan el mismo servicio que `/api/mcp/tokens`, sin
 * exponer hash ni sal y sin permitir tocar tokens de otra cuenta.
 */

type Usuario = { userId: string; email: string; displayName: string; fullName: null };
type Token = { id: string; user_id: string; email: string; label: string; token_hash: string; salt: string; last_used_at: number | null; created_at: number; revoked_at: number | null };

const tokenId = "88888888-8888-4888-8888-888888888888";
const otherId = "77777777-7777-4777-8777-777777777777";
const token = (extra: Partial<Token> = {}): Token => ({
  id: tokenId,
  user_id: "u-owner",
  email: "owner@example.com",
  label: "Claude",
  token_hash: "hash-secreto",
  salt: "sal-secreta",
  last_used_at: null,
  created_at: 1,
  revoked_at: null,
  ...extra,
});

const state = vi.hoisted(() => {
  const tokens: Token[] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        all: async () => {
          if (!sql.includes("FROM mcp_tokens")) return { results: [] };
          return { results: tokens.filter((item) => item.user_id === args[0]) };
        },
        run: async () => {
          if (!sql.includes("UPDATE mcp_tokens SET revoked_at")) return { meta: { changes: 0 } };
          const actual = tokens.find((item) => item.id === args[1] && item.user_id === args[2] && item.revoked_at === null);
          if (!actual) return { meta: { changes: 0 } };
          actual.revoked_at = Number(args[0]);
          return { meta: { changes: 1 } };
        },
        first: async () => null,
      }),
    }),
  };
  return { user: null as Usuario | null, tokens, db };
});

vi.mock("../../../lib/server/access/auth", () => ({ getChatGPTUser: async () => state.user }));
vi.mock("../../../db", () => ({ getD1: () => state.db }));

import { DELETE as revocarHttp, GET as listarHttp } from "./tokens/route";
import { registerTools } from "../../../lib/server/mcp/registro";

const owner: Usuario = { userId: "u-owner", email: "owner@example.com", displayName: "Owner", fullName: null };

async function llamar(tool: string, user: Usuario, args: Record<string, unknown>) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    return await client.callTool({ name: tool, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

function errorDe(result: Awaited<ReturnType<typeof llamar>>) {
  return (result.structuredContent as { error: { codigo: string; estado: number; mensaje: string } }).error;
}

describe("paridad MCP ↔ HTTP de tokens propios", () => {
  it("lista solo los tokens propios y coincide con la ruta sin exponer secretos", async () => {
    state.user = owner;
    state.tokens.splice(0, state.tokens.length, token(), token({ id: otherId, user_id: "u-otro", label: "Otro" }));
    const http = await listarHttp();
    expect(http.status).toBe(200);
    const lista = await http.json();
    const mcp = await llamar("listar_tokens_mcp", owner, {});
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { tokens: unknown }).tokens).toEqual(lista);
    expect(JSON.stringify(mcp)).not.toContain("hash-secreto");
    expect(JSON.stringify(mcp)).not.toContain("sal-secreta");
  });

  it("avisa antes de revocar y no cambia nada", async () => {
    state.tokens.splice(0, state.tokens.length, token());
    const aviso = await llamar("revocar_token_mcp", owner, { tokenId });
    expect(aviso.isError).toBeUndefined();
    expect(aviso.structuredContent).toMatchObject({ necesitaConfirmacion: true, tokenId, etiqueta: "Claude", creadoEn: 1, ultimoUso: null, revocadoEn: null });
    expect(state.tokens[0].revoked_at).toBeNull();
  });

  it("revoca el mismo token por MCP y por la ruta", async () => {
    state.user = owner;
    state.tokens.splice(0, state.tokens.length, token());
    const mcp = await llamar("revocar_token_mcp", owner, { tokenId, confirmar: true });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ revocado: tokenId, etiqueta: "Claude" });
    expect(state.tokens[0].revoked_at).not.toBeNull();

    state.tokens.splice(0, state.tokens.length, token());
    const http = await revocarHttp(new Request(`https://site.test/api/mcp/tokens?id=${tokenId}`, { method: "DELETE" }));
    expect(http.status).toBe(204);
    expect(state.tokens[0].revoked_at).not.toBeNull();
  });

  it("un token ajeno no se lista ni se revoca por ninguna vía", async () => {
    state.user = owner;
    state.tokens.splice(0, state.tokens.length, token({ id: otherId, user_id: "u-otro" }));
    const listado = await llamar("listar_tokens_mcp", owner, {});
    expect((listado.structuredContent as { tokens: unknown[] }).tokens).toEqual([]);
    const mcp = await llamar("revocar_token_mcp", owner, { tokenId: otherId, confirmar: true });
    expect(errorDe(mcp)).toEqual({ codigo: "not_found", estado: 404, mensaje: "Token no encontrado." });
    expect(state.tokens[0].revoked_at).toBeNull();
    const http = await revocarHttp(new Request(`https://site.test/api/mcp/tokens?id=${otherId}`, { method: "DELETE" }));
    expect(http.status).toBe(404);
  });
});
