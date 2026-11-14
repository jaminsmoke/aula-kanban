import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "../../../../lib/server/auth";

const mocks = vi.hoisted(() => ({
  user: null as ChatGPTUser | null,
  created: { id: "t1", token: "ak_mcp_t1_secreto", label: "Claude", createdAt: 1 },
  list: [{ id: "t1", label: "Claude", lastUsedAt: null, createdAt: 1, revokedAt: null }],
  revoked: false,
}));

vi.mock("../../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../db", () => ({ getD1: () => ({}) }));
vi.mock("../../../../lib/server/mcp/tokens", () => ({
  createMcpToken: async () => mocks.created,
  listMcpTokens: async () => mocks.list,
  revokeMcpToken: async () => mocks.revoked,
}));

import { DELETE, GET, POST } from "./route";

const user: ChatGPTUser = { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null };

const createRequest = (body: unknown, origin = "https://site.test") =>
  new Request("https://site.test/api/mcp/tokens", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("API de tokens del MCP", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.revoked = false;
  });

  it("exige sesión en las tres operaciones", async () => {
    expect(((await GET()).status)).toBe(401);
    expect(((await POST(createRequest({ label: "Claude" }))).status)).toBe(401);
    expect(((await DELETE(new Request("https://site.test/api/mcp/tokens?id=t1"))).status)).toBe(401);
  });

  it("lista sin secretos y crea devolviendo el token una sola vez", async () => {
    mocks.user = user;
    const listed = await GET();
    const listBody = (await listed.json()) as Array<Record<string, unknown>>;
    expect(listed.status).toBe(200);
    expect(listBody).toHaveLength(1);
    expect(listBody[0]).toEqual({ id: "t1", label: "Claude", lastUsedAt: null, createdAt: 1, revokedAt: null });

    const created = await POST(createRequest({ label: "Claude" }));
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as Record<string, unknown>;
    expect(createdBody.token).toBe("ak_mcp_t1_secreto");
  });

  it("rechaza otro origen y etiquetas inválidas", async () => {
    mocks.user = user;
    expect(((await POST(createRequest({ label: "Claude" }, "https://otro.test"))).status)).toBe(403);
    expect(((await POST(createRequest({ label: "x".repeat(81) }))).status)).toBe(400);
  });

  it("revoca y responde 404 si el token no es suyo", async () => {
    mocks.user = user;
    mocks.revoked = true;
    const ok = await DELETE(new Request("https://site.test/api/mcp/tokens?id=00000000-0000-4000-8000-000000000000"));
    expect(ok.status).toBe(204);

    mocks.revoked = false;
    const missing = await DELETE(new Request("https://site.test/api/mcp/tokens?id=00000000-0000-4000-8000-000000000000"));
    expect(missing.status).toBe(404);
  });
});
