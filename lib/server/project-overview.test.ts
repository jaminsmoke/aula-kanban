import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "./auth";

const mocks = vi.hoisted(() => ({
  owner: false,
  admin: false,
  projects: [] as Array<{ id: string; name: string; createdAt: number }>,
  members: [] as Array<{ projectId: string; status: string; role: string; studentSection: string | null; teacherId: string | null }>,
  legacy: null as string | null,
  selectCalls: 0,
  ensure: vi.fn(),
  cleanup: vi.fn(),
  identityUpdate: vi.fn(),
}));

vi.mock("../../db", () => ({
  getD1: () => ({}),
  getDb: () => ({
    update: () => ({
      set: (values: unknown) => ({
        where: () => {
          mocks.identityUpdate(values);
          return Promise.resolve();
        },
      }),
    }),
    select: () => {
      const rows = mocks.selectCalls++ === 0 ? mocks.projects : mocks.members;
      const chain = Promise.resolve(rows) as Promise<unknown[]> & { orderBy: () => unknown; where: () => unknown };
      chain.orderBy = () => chain;
      chain.where = () => chain;
      return { from: () => chain };
    },
  }),
}));

vi.mock("./project-access", () => ({
  isOwner: async () => mocks.owner,
  isAdministrator: async () => mocks.admin,
}));

vi.mock("./project-rekey", () => ({
  ensureLegacyProjectUuid: mocks.ensure,
  canonicalProjectId: async () => mocks.legacy,
}));

vi.mock("./storage", () => ({ cleanupOrphanUploads: mocks.cleanup }));

import { loadProjectsOverview } from "./project-overview";

const user: ChatGPTUser = { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null };
const project = { id: "p1", name: "Proyecto", createdAt: 1 };

beforeEach(() => {
  mocks.owner = false;
  mocks.admin = false;
  mocks.projects = [project];
  mocks.members = [];
  mocks.legacy = null;
  mocks.selectCalls = 0;
  mocks.ensure.mockReset().mockResolvedValue("nuevo-id");
  mocks.cleanup.mockReset().mockResolvedValue(undefined);
  mocks.identityUpdate.mockReset();
});

describe("arranque y listado de proyectos", () => {
  it("migra y limpia para el propietario y devuelve todos los proyectos", async () => {
    mocks.owner = true;
    mocks.legacy = "nuevo-id";

    const result = await loadProjectsOverview(user);

    expect(result).toEqual({
      ok: true,
      data: {
        projects: [{ ...project, role: "owner", studentSection: null, teacherId: null }],
        isOwner: true,
        isAdmin: false,
        legacyProjectId: "nuevo-id",
      },
    });
    expect(mocks.ensure).toHaveBeenCalledOnce();
    expect(mocks.identityUpdate).toHaveBeenCalledWith({ displayName: "Docente" });
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it("deja la migración al propietario y limpia para la administración", async () => {
    mocks.admin = true;
    mocks.legacy = "nuevo-id";

    const result = await loadProjectsOverview(user);

    expect(result).toMatchObject({ ok: true, data: { isOwner: false, isAdmin: true, legacyProjectId: "nuevo-id" } });
    expect(result.ok && result.data.projects[0].role).toBe("admin");
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it("filtra por membresía activa y no expone isAdmin al profesorado", async () => {
    mocks.projects = [project, { id: "p2", name: "Otro", createdAt: 2 }];
    mocks.members = [
      { projectId: "p1", status: "active", role: "teacher", studentSection: null, teacherId: "t1" },
      { projectId: "p2", status: "pending", role: "student", studentSection: "s1", teacherId: null },
    ];
    mocks.legacy = "p1";

    const result = await loadProjectsOverview(user);

    expect(result).toEqual({
      ok: true,
      data: {
        projects: [{ ...project, role: "teacher", studentSection: null, teacherId: "t1" }],
        isOwner: false,
        legacyProjectId: "p1",
      },
    });
    expect(mocks.ensure).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });

  it("devuelve 503 si falla la migración y no continúa el arranque", async () => {
    mocks.owner = true;
    mocks.ensure.mockRejectedValueOnce(new Error("fallo"));

    await expect(loadProjectsOverview(user)).resolves.toEqual({
      ok: false,
      status: 503,
      message: "No se pudo actualizar el identificador del proyecto. Vuelve a intentarlo.",
    });
    expect(mocks.identityUpdate).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });

  it("tolera el fallo de la limpieza y sigue listando", async () => {
    mocks.owner = true;
    mocks.cleanup.mockRejectedValueOnce(new Error("R2 no disponible"));

    const result = await loadProjectsOverview(user);

    expect(result.ok).toBe(true);
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it("se puede repetir sin cambiar el resultado", async () => {
    mocks.owner = true;
    mocks.legacy = "nuevo-id";
    const first = await loadProjectsOverview(user);
    mocks.selectCalls = 0;
    const second = await loadProjectsOverview(user);

    expect(second).toEqual(first);
    expect(mocks.ensure).toHaveBeenCalledTimes(2);
    expect(mocks.identityUpdate).toHaveBeenCalledTimes(2);
  });
});
