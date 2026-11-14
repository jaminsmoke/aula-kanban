import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "guest",
  allowed: true,
  save: vi.fn(),
  read: vi.fn(),
}));
vi.mock("../../../lib/server/project", () => ({ validProject: async () => mocks.allowed ? { id: "project1", access: { role: mocks.role } } : null }));
vi.mock("../../chatgpt-auth", () => ({ getChatGPTUser: async () => ({ userId: "user1" }) }));
vi.mock("../../../lib/server/app-documents", () => ({ saveAppDocument: mocks.save, readAppDocument: mocks.read }));

import { GET, POST } from "./route";

const endpoint = "https://site.test/api/app-documents?project=project1&app=blockly";
const request = (body: string, url = endpoint) => new Request(url, {
  method: "POST", headers: { origin: "https://site.test", "content-type": "application/json" }, body,
});

describe("documentos de apps", () => {
  beforeEach(() => {
    mocks.role = "guest";
    mocks.allowed = true;
    mocks.save.mockReset();
    mocks.read.mockReset();
    mocks.read.mockResolvedValue({ state: { code: "inicio" }, updatedAt: 5 });
  });

  it("lee el documento de una app del proyecto", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: { code: "inicio" }, updatedAt: 5 });
    expect(mocks.read).toHaveBeenCalledWith("project1", "blockly");
  });

  it("rechaza apps que no están en el catálogo", async () => {
    const response = await GET(new Request("https://site.test/api/app-documents?project=project1&app=otra"));
    expect(response.status).toBe(400);
  });

  it("impide a un invitado sobrescribir el documento", async () => {
    expect((await POST(request('{"state":{"code":"x"}}'))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("acepta y serializa un documento válido de un alumno", async () => {
    mocks.role = "student";
    expect((await POST(request('{"state":{"code":"x"}}'))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith({
      projectId: "project1",
      appId: "blockly",
      state: '{"code":"x"}',
      updatedByUserId: "user1",
    });
  });

  it("rechaza cuerpos excesivos antes de guardarlos", async () => {
    mocks.role = "student";
    expect((await POST(request(JSON.stringify({ state: { value: "x".repeat(200_001) } })))).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
