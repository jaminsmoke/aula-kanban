import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "owner", email: "owner@example.com" } as { userId: string; email: string } | null,
  owner: true,
  prepare: vi.fn((sql: string) => sql),
  batch: vi.fn(),
}));
vi.mock("../../../../db", () => ({ getD1: () => ({ prepare: mocks.prepare, batch: mocks.batch }) }));
vi.mock("../../../../lib/server/access/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../lib/server/projects/project-access", () => ({ isOwner: async () => mocks.owner }));
import { POST } from "./route";

function request(origin = "https://site.test") {
  return new Request("https://site.test/api/admin/demo", { method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}" });
}

beforeEach(() => {
  mocks.user = { userId: "owner", email: "owner@example.com" };
  mocks.owner = true;
  mocks.prepare.mockClear();
  mocks.batch.mockReset().mockResolvedValue([]);
});

describe("preparación de la demo", () => {
  it("solo permite al propietario autenticado y desde el mismo origen", async () => {
    mocks.user = null;
    expect((await POST(request())).status).toBe(401);
    mocks.user = { userId: "otro", email: "otro@example.com" };
    mocks.owner = false;
    expect((await POST(request())).status).toBe(403);
    mocks.owner = true;
    expect((await POST(request("https://otro.test"))).status).toBe(403);
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("ejecuta un único lote de sentencias generadas y comunica los fallos", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.batch).toHaveBeenCalledOnce();
    expect(mocks.prepare.mock.calls[0][0]).toContain("INSERT OR ABORT INTO projects");
    mocks.batch.mockRejectedValueOnce(new Error("collision"));
    expect((await POST(request())).status).toBe(409);
  });
});
