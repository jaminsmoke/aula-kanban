import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "owner" as "owner" | "admin" | "teacher" | "student" | "guest",
  list: vi.fn(),
  invite: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../../lib/server/projects/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? {
      status: "ok",
      project: {
        id: "p1",
        access: {
          user: { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null },
          role: mocks.role,
          studentSection: null,
          teacherId: null,
        },
      },
    }
    : { status: mocks.status },
}));

vi.mock("../../../lib/server/access/members", () => ({
  listMembers: mocks.list,
  inviteMember: mocks.invite,
  removeMember: mocks.remove,
}));

import { DELETE, GET, POST } from "./route";

const endpoint = "https://site.test/api/members?project=p1";
const member = {
  id: "66666666-6666-4666-8666-666666666666",
  projectId: "p1",
  email: "ada@example.com",
  role: "student",
  studentSection: "s1",
  teacherId: null,
  status: "pending",
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
  mocks.status = "ok";
  mocks.role = "owner";
  mocks.list.mockReset();
  mocks.invite.mockReset();
  mocks.remove.mockReset();
  mocks.list.mockResolvedValue({ ok: true, miembros: [member] });
  mocks.invite.mockResolvedValue({ ok: true, miembro: member, creada: true });
  mocks.remove.mockResolvedValue({ ok: true, id: member.id });
});

describe("contrato de /api/members", () => {
  it("lista los miembros sin userId para quien puede gestionarlos", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([member]);
    expect(mocks.list).toHaveBeenCalledWith("p1", expect.objectContaining({ role: "owner" }));
  });

  it("traduce el 403 del servicio sin inventar la respuesta", async () => {
    mocks.list.mockResolvedValue({ ok: false, status: 403, message: "No tienes permiso para gestionar miembros." });
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "No tienes permiso para gestionar miembros." });
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente antes de listar", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status, status).toBe(code);
    }
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("responde 201 al crear la invitación y 200 si ya existía", async () => {
    const created = await POST(mutation("POST", { email: "ada@example.com", role: "student", studentSection: "s1" }));
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual(member);

    mocks.invite.mockResolvedValue({ ok: true, miembro: member, creada: false });
    const existing = await POST(mutation("POST", { email: "ada@example.com", role: "student", studentSection: "s1" }));
    expect(existing.status).toBe(200);
    expect(mocks.invite).toHaveBeenCalledTimes(2);
  });

  it("propaga los 400 y 409 del servicio de invitaciones", async () => {
    mocks.invite.mockResolvedValue({ ok: false, status: 400, message: "Revisa el correo y el rol." });
    expect((await POST(mutation("POST", { email: "no" }))).status).toBe(400);

    mocks.invite.mockResolvedValue({ ok: false, status: 409, message: "Esa cuenta ya tiene otro rol en el proyecto." });
    const conflict = await POST(mutation("POST", { email: "ada@example.com", role: "guest" }));
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ message: "Esa cuenta ya tiene otro rol en el proyecto." });
  });

  it("exige mismo origen y JSON antes de invitar", async () => {
    const noOrigin = new Request(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect((await POST(noOrigin)).status).toBe(403);

    const wrongType = new Request(endpoint, { method: "POST", headers: { origin: "https://site.test", "content-type": "text/plain" }, body: "{}" });
    expect((await POST(wrongType)).status).toBe(415);
    expect(mocks.invite).not.toHaveBeenCalled();
  });

  it("retira un miembro por identificador y responde solo con el id", async () => {
    const response = await DELETE(mutation("DELETE", { id: member.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: member.id });
    expect(mocks.remove).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }), member.id);
  });

  it("rechaza un id que no es UUID antes de tocar el servicio", async () => {
    expect((await DELETE(mutation("DELETE", { id: "no-es-uuid" }))).status).toBe(400);
    expect((await DELETE(mutation("DELETE", null))).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("traduce el 404 del servicio al retirar y exige mismo origen", async () => {
    mocks.remove.mockResolvedValue({ ok: false, status: 404, message: "Ese miembro ya no está disponible." });
    expect((await DELETE(mutation("DELETE", { id: member.id }))).status).toBe(404);

    const noOrigin = new Request(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: member.id }) });
    expect((await DELETE(noOrigin)).status).toBe(403);
  });
});
