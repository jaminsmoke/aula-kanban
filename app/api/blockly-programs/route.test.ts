import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ role: "guest", write: vi.fn(), allowed: true }));
vi.mock("../../../lib/server/project", () => ({ validProject: async () => mocks.allowed ? { id: "project1", access: { role: mocks.role } } : null }));
vi.mock("../../chatgpt-auth", () => ({ getChatGPTUser: async () => ({ userId: "user1" }) }));
vi.mock("../../../db", () => ({ getDb: () => ({ insert: () => ({ values: () => ({ onConflictDoUpdate: mocks.write }) }) }) }));

import { POST } from "./route";

const request = (body: string) => new Request("https://site.test/api/blockly-programs?project=project1", {
  method: "POST", headers: { origin: "https://site.test", "content-type": "application/json" }, body,
});

describe("guardado de Blockly", () => {
  beforeEach(() => { mocks.role = "guest"; mocks.allowed = true; mocks.write.mockReset(); });
  it("impide a un invitado sobrescribir el programa", async () => {
    expect((await POST(request('{"state":{}}'))).status).toBe(403);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("acepta un programa válido de un alumno", async () => {
    mocks.role = "student";
    expect((await POST(request('{"state":{}}'))).status).toBe(200);
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it("rechaza cuerpos excesivos antes de guardarlos", async () => {
    mocks.role = "student";
    expect((await POST(request(JSON.stringify({ state: { value: "x".repeat(200_001) } })))).status).toBe(413);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
