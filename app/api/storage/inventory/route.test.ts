import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "u1", email: "docente@example.com" } as { userId: string; email: string } | null,
  owner: false,
  admin: false,
  audit: vi.fn(),
}));

vi.mock("../../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../lib/server/project-access", () => ({
  isOwner: async () => mocks.owner,
  isAdministrator: async () => mocks.admin,
}));
vi.mock("../../../../lib/server/uploads/inventory", () => ({ auditInventoryPage: mocks.audit }));

import { StorageUnavailableError } from "../../../../lib/server/storage/repository";
import { GET } from "./route";

const endpoint = "https://site.test/api/storage/inventory";
const informe = {
  entries: [],
  counts: { objects: 0, withRow: 0, orphanObjects: 0, missingObjects: 0, reviewKeys: 0 },
  truncated: false,
  cursor: null,
  range: null,
};

/**
 * Construye la URL del inventario.
 * @param query - Cadena de consulta sin `?`.
 * @returns La URL completa.
 */
function url(query = "") {
  return new Request(query ? `${endpoint}?${query}` : endpoint);
}

beforeEach(() => {
  mocks.user = { userId: "u1", email: "docente@example.com" };
  mocks.owner = true;
  mocks.admin = false;
  mocks.audit.mockReset();
  mocks.audit.mockResolvedValue(informe);
});

describe("ruta de inventario de R2", () => {
  it("exige sesión y permiso de propietario o administración", async () => {
    mocks.user = null;
    expect((await GET(url())).status).toBe(401);

    mocks.user = { userId: "u1", email: "docente@example.com" };
    mocks.owner = false;
    mocks.admin = false;
    expect((await GET(url())).status).toBe(403);
    expect(mocks.audit).not.toHaveBeenCalled();

    mocks.admin = true;
    expect((await GET(url())).status).toBe(200);
    expect(mocks.audit).toHaveBeenCalledWith({ cursor: undefined, limit: undefined });
  });

  it("acepta cursor y un límite dentro del tope", async () => {
    const response = await GET(url("cursor=c1&limit=25"));
    expect(response.status).toBe(200);
    expect(mocks.audit).toHaveBeenCalledWith({ cursor: "c1", limit: 25 });
    expect(await response.json()).toEqual(informe);
  });

  it("rechaza un límite o un cursor inválidos antes de consultar R2", async () => {
    for (const query of ["limit=0", "limit=101", "limit=abc", "limit=1.5", "cursor=", `cursor=${"x".repeat(8193)}`]) {
      expect((await GET(url(query))).status, query).toBe(400);
    }
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("traduce R2 ausente a 503 y otros fallos a 502", async () => {
    mocks.audit.mockRejectedValueOnce(new StorageUnavailableError());
    expect((await GET(url())).status).toBe(503);

    mocks.audit.mockRejectedValueOnce(new Error("fallo"));
    expect((await GET(url())).status).toBe(502);
  });
});
