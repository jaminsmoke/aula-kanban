import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found",
  read: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../../../lib/server/projects/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? {
        status: "ok",
        project: {
          id: "project1",
          access: {
            user: { userId: "u1", email: "u1@example.com", displayName: "Uno", fullName: null },
            role: "teacher",
            studentSection: null,
            teacherId: null,
          },
        },
      }
    : { status: mocks.status },
}));

vi.mock("../../../lib/server/board/boards", () => ({
  BOARD_INVALID: "La pizarra no es válida o supera los 2 MB.",
  BOARD_OWNER_TYPES: ["task", "project", "space"],
  MAX_BOARD_SNAPSHOT_BYTES: 2 * 1024 * 1024,
  readBoard: mocks.read,
  saveBoard: mocks.save,
}));

import { GET, PUT } from "./route";

const endpoint = "https://site.test/api/boards?project=project1&ownerType=space&ownerId=project1";
const payload = { ownerType: "space", ownerId: "project1", snapshot: '{"elements":[]}', revision: 0 };
const request = (body: unknown = payload) => new Request(endpoint, {
  method: "PUT",
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});
const record = { ownerType: "space", ownerId: "project1", snapshot: '{"elements":[]}', revision: 1, updatedAt: 10 };

describe("ruta de pizarras", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.read.mockReset();
    mocks.save.mockReset();
    mocks.read.mockResolvedValue({ ok: true, value: record });
    mocks.save.mockResolvedValue({ ok: true, value: record });
  });

  it("lee una pizarra válida", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(record);
    expect(mocks.read).toHaveBeenCalledWith("project1", "space", "project1");
  });

  it("rechaza un tipo de dueño desconocido", async () => {
    const response = await GET(new Request("https://site.test/api/boards?project=project1&ownerType=otro&ownerId=project1"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "La pizarra pedida no es válida." });
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("mapea el dueño inexistente al 404 del servicio", async () => {
    mocks.read.mockResolvedValue({ ok: false, status: 404, message: "No se encuentra el dueño de la pizarra." });
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "No se encuentra el dueño de la pizarra." });
  });

  it("exige origen y cuerpo válido antes de guardar", async () => {
    const noOrigin = new Request(endpoint, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    expect((await PUT(noOrigin)).status).toBe(403);
    expect((await PUT(request({ ownerType: "space", ownerId: "project1" }))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("conserva el 409 con la marca de conflicto", async () => {
    mocks.save.mockResolvedValue({ ok: false, status: 409, message: "La pizarra cambió en otra sesión. Actualiza antes de guardar." });
    const response = await PUT(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "La pizarra cambió en otra sesión. Actualiza antes de guardar.",
      conflict: true,
    });
  });

  it("guarda con el proyecto y el acceso resueltos", async () => {
    const response = await PUT(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(record);
    expect(mocks.save).toHaveBeenCalledWith({
      projectId: "project1",
      access: expect.objectContaining({ role: "teacher" }),
      ownerType: "space",
      ownerId: "project1",
      snapshot: '{"elements":[]}',
      revision: 0,
    });
  });
});
