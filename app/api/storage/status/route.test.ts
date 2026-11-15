import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as null | { userId: string; email: string },
  owner: false,
  admin: false,
  status: { database: true, bucket: true, bucketReachable: true, uploads: 2, ok: true },
  stats: { total: 2, rows: [] } as { total: number; rows: unknown[] },
  boards: { boards: 1, totalChars: 10, maxChars: 10, averageChars: 10, over1mb: 0, over1_5mb: 0, largest: [] },
}));

vi.mock("../../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../lib/server/project-access", () => ({
  isOwner: async () => mocks.owner,
  isAdministrator: async () => mocks.admin,
}));
vi.mock("../../../../lib/server/storage", () => ({ storageStatus: async () => mocks.status }));
vi.mock("../../../../lib/server/uploads/stats", () => ({ uploadStats: async () => mocks.stats }));
vi.mock("../../../../lib/server/board-stats", () => ({ boardStats: async () => mocks.boards }));

import { GET } from "./route";

describe("diagnóstico de almacenamiento", () => {
  beforeEach(() => {
    mocks.user = { userId: "u-owner", email: "owner@example.com" };
    mocks.owner = true;
    mocks.admin = false;
  });

  it("exige sesión", async () => {
    mocks.user = null;
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("reserva el diagnóstico al propietario y la administración", async () => {
    mocks.owner = false;
    mocks.admin = false;
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("devuelve el estado a la administración", async () => {
    mocks.owner = false;
    mocks.admin = true;
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...mocks.status, uploadStats: mocks.stats, boardStats: mocks.boards });
  });

  it("devuelve el estado al propietario", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...mocks.status, uploadStats: mocks.stats, boardStats: mocks.boards });
  });

});
