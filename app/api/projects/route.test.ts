import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null } as null | {
    userId: string;
    displayName: string;
    email: string;
    fullName: string | null;
  },
  overview: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../../lib/server/access/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../lib/server/projects/project-access", () => ({ resolveProject: async () => ({ status: "unauthenticated" }) }));
vi.mock("../../../lib/server/projects/project-overview", () => ({ loadProjectsOverview: mocks.overview }));
vi.mock("../../../lib/server/projects/projects", () => ({ createProject: mocks.create, deleteProject: mocks.remove }));

import { DELETE, GET, POST } from "./route";

const endpoint = "https://site.test/api/projects";
const project = { id: "66666666-6666-4666-8666-666666666666", name: "Aula 1", createdAt: 1 };
const overview = {
  projects: [{ ...project, role: "owner", studentSection: null, teacherId: null }],
  isOwner: true,
  isAdmin: false,
  legacyProjectId: null,
};

/**
 * Construye una mutación JSON con el mismo origen de la web.
 * @param method - Verbo de la mutación.
 * @param body - Cuerpo que se serializa.
 * @param headers - Cabeceras que sustituyen a las de la web.
 * @returns La petición lista para la ruta.
 */
function mutation(method: "POST" | "DELETE", body: unknown, headers: Record<string, string> = {}) {
  return new Request(endpoint, {
    method,
    headers: { origin: "https://site.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.user = { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null };
  mocks.overview.mockReset();
  mocks.create.mockReset();
  mocks.remove.mockReset();
  mocks.overview.mockResolvedValue({ ok: true, data: overview });
  mocks.create.mockResolvedValue({ ok: true, proyecto: project, creado: true });
  mocks.remove.mockResolvedValue({ ok: true, id: project.id, deleted: true });
});

describe("contrato de /api/projects", () => {
  it("responde 401 sin sesión antes de cargar proyectos", async () => {
    mocks.user = null;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Inicia sesión para continuar." });
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("lista proyectos, roles y banderas con el usuario de la sesión", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(overview);
    expect(mocks.overview).toHaveBeenCalledWith(mocks.user);
  });

  it("traduce el 503 del arranque sin inventar la respuesta", async () => {
    mocks.overview.mockResolvedValue({ ok: false, status: 503, message: "No se pudo actualizar el identificador del proyecto. Vuelve a intentarlo." });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "No se pudo actualizar el identificador del proyecto. Vuelve a intentarlo." });
  });

  it("responde 201 al crear y 200 cuando el proyecto ya existía", async () => {
    const created = await POST(mutation("POST", { id: project.id, name: project.name }));
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual(project);

    mocks.create.mockResolvedValue({ ok: true, proyecto: project, creado: false });
    const existing = await POST(mutation("POST", { id: project.id, name: project.name }));
    expect(existing.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it("propaga los 403, 400 y 409 del servicio de alta", async () => {
    for (const [status, message] of [
      [403, "Solo el propietario o un administrador pueden crear proyectos."],
      [400, "Escribe un nombre de hasta 80 caracteres."],
      [409, "No se pudo crear el proyecto. Vuelve a intentarlo."],
    ] as const) {
      mocks.create.mockResolvedValue({ ok: false, status, message });
      const response = await POST(mutation("POST", { id: project.id, name: "" }));
      expect(response.status, message).toBe(status);
      expect(await response.json()).toEqual({ message });
    }
  });

  it("exige mismo origen y JSON antes de crear", async () => {
    const noOrigin = new Request(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect((await POST(noOrigin)).status).toBe(403);

    const wrongType = new Request(endpoint, { method: "POST", headers: { origin: "https://site.test", "content-type": "text/plain" }, body: "{}" });
    expect((await POST(wrongType)).status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("elimina por identificador y devuelve si el proyecto existía", async () => {
    const response = await DELETE(mutation("DELETE", { id: project.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: project.id, deleted: true });
    expect(mocks.remove).toHaveBeenCalledWith(mocks.user, project.id);

    mocks.remove.mockResolvedValue({ ok: true, id: project.id, deleted: false });
    expect(await (await DELETE(mutation("DELETE", { id: project.id }))).json()).toEqual({ id: project.id, deleted: false });
  });

  it("rechaza un id ausente, nulo o demasiado largo antes del servicio", async () => {
    for (const body of [{}, { id: null }, { id: "" }, { id: "x".repeat(81) }]) {
      const response = await DELETE(mutation("DELETE", body));
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(await response.json()).toEqual({ message: "Proyecto no válido." });
    }
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("propaga el 403 y el 503 del borrado", async () => {
    mocks.remove.mockResolvedValue({ ok: false, status: 403, message: "Solo el propietario o un administrador pueden eliminar proyectos." });
    expect((await DELETE(mutation("DELETE", { id: project.id }))).status).toBe(403);

    mocks.remove.mockResolvedValue({ ok: false, status: 503, message: "El proyecto se ha eliminado, pero no se han podido limpiar todos sus archivos. Vuelve a intentarlo." });
    const failed = await DELETE(mutation("DELETE", { id: project.id }));
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ message: "El proyecto se ha eliminado, pero no se han podido limpiar todos sus archivos. Vuelve a intentarlo." });
  });

  it("exige mismo origen antes de eliminar", async () => {
    const noOrigin = new Request(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: project.id }) });
    expect((await DELETE(noOrigin)).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
