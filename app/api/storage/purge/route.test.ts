import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "u1", email: "docente@example.com" } as { userId: string; email: string } | null,
  owner: false,
  admin: false,
  purge: vi.fn(),
}));

vi.mock("../../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../lib/server/project-access", () => ({
  isOwner: async () => mocks.owner,
  isAdministrator: async () => mocks.admin,
}));
vi.mock("../../../../lib/server/uploads/purge", () => ({ purgeAllUnusedUploads: mocks.purge }));

import { StorageUnavailableError } from "../../../../lib/server/storage/repository";
import { POST } from "./route";

const endpoint = "https://site.test/api/storage/purge";

/**
 * Construye una petición de purga.
 * @param body - Cuerpo JSON o `null` para un cuerpo corrupto.
 * @param headers - Cabeceras adicionales.
 * @returns La petición lista para la ruta.
 */
function request(body: unknown = {}, headers: Record<string, string> = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin: "https://site.test", "content-type": "application/json", ...headers },
    body: body === null ? "{corrupto" : JSON.stringify(body),
  });
}

const resumen = {
  simulated: true,
  projects: 1,
  candidates: 2,
  deleted: 0,
  skipped: 0,
  failed: 0,
  bytes: 20,
  hasMore: false,
  problems: [],
};

beforeEach(() => {
  mocks.user = { userId: "u1", email: "docente@example.com" };
  mocks.owner = true;
  mocks.admin = false;
  mocks.purge.mockReset();
  mocks.purge.mockResolvedValue(resumen);
});

describe("ruta de purga de archivos", () => {
  it("exige sesión y permiso de propietario o administración", async () => {
    mocks.user = null;
    expect((await POST(request())).status).toBe(401);

    mocks.user = { userId: "u1", email: "docente@example.com" };
    mocks.owner = false;
    mocks.admin = false;
    expect((await POST(request())).status).toBe(403);

    mocks.admin = true;
    expect((await POST(request())).status).toBe(200);
  });

  it("rechaza otro origen antes de autenticar", async () => {
    const response = await POST(request({}, { origin: "https://otro.test" }));
    expect(response.status).toBe(403);
    expect(mocks.purge).not.toHaveBeenCalled();
  });

  it("exige JSON y un cuerpo válido", async () => {
    expect((await POST(request({}, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request(null))).status).toBe(400);
    expect((await POST(request({ limite: 0 }))).status).toBe(400);
    expect((await POST(request({ proyectoId: "x" }))).status).toBe(400);
    expect(mocks.purge).not.toHaveBeenCalled();
  });

  it("simula por defecto y solo borra cuando se pide explícitamente", async () => {
    expect(await (await POST(request())).json()).toEqual(resumen);
    expect(mocks.purge).toHaveBeenLastCalledWith({ simulate: true, limit: undefined });

    await POST(request({ simulacion: false, limite: 10 }));
    expect(mocks.purge).toHaveBeenLastCalledWith({ simulate: false, limit: 10 });
  });

  it("traduce R2 ausente a 503 y otros fallos a 502", async () => {
    mocks.purge.mockRejectedValueOnce(new StorageUnavailableError());
    expect((await POST(request({ simulacion: false }))).status).toBe(503);

    mocks.purge.mockRejectedValueOnce(new Error("fallo"));
    expect((await POST(request({ simulacion: false }))).status).toBe(502);
  });
});
