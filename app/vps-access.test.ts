import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as unknown[][] }));
vi.mock("../db", () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => state.rows.shift() ?? [] }) }) }),
}));
vi.mock("../lib/server/project", () => ({ isOwnerEmail: (email: string) => email === "owner@example.test" }));

import { currentVpsAccess } from "../lib/server/vps-access";

const principal = { userId: "user_1", email: "student@example.test", projectId: "class" };
beforeEach(() => { state.rows = []; });

describe("VPS project access", () => {
  it("does not grant access to a deleted or unknown project, even for an owner", async () => {
    state.rows = [[]];
    expect(await currentVpsAccess({ ...principal, email: "owner@example.test" })).toBeNull();
  });
  it("recognizes the owner and a currently linked administrator", async () => {
    state.rows = [[{ id: "class" }]];
    expect(await currentVpsAccess({ ...principal, email: "owner@example.test" })).toBe("owner");
    state.rows = [[{ id: "class" }], [{ id: "admin" }]];
    expect(await currentVpsAccess(principal)).toBe("admin");
  });
  it("allows known active member roles and rejects absent or unknown roles", async () => {
    for (const role of ["teacher", "student", "guest"]) {
      state.rows = [[{ id: "class" }], [], [{ role }]];
      expect(await currentVpsAccess(principal)).toBe(role);
    }
    for (const rows of [[], [{ role: "unrecognized" }]]) {
      state.rows = [[{ id: "class" }], [], rows];
      expect(await currentVpsAccess(principal)).toBeNull();
    }
  });
});
