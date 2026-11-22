import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin" as "owner" | "admin" | "teacher" | "student" | "guest",
  studentSection: null as string | null,
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  rows: [] as Array<Record<string, unknown>>,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  projectData: vi.fn(),
  decorate: vi.fn(),
}));

vi.mock("../../../lib/server/projects/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1", access: { user: { userId: "u1", displayName: "Admin", email: "admin@example.com", fullName: null }, role: mocks.role, studentSection: mocks.studentSection, teacherId: null } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));
vi.mock("../../../lib/server/access/deleted-profiles", () => ({ purgeDeletedProfiles: async () => {} }));
vi.mock("../../../lib/server/tasks/queries", () => ({
  projectData: mocks.projectData,
  decorate: mocks.decorate,
  taskAtRevision: async () => mocks.rows[0] ?? null,
}));
vi.mock("../../../lib/server/tasks/mutations", () => ({
  createTask: mocks.create,
  updateTask: mocks.update,
  deleteTask: mocks.remove,
}));
vi.mock("../../../db", () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => mocks.rows }) }) }),
}));

import { GET, PATCH, POST } from "./route";

const endpoint = "https://site.test/api/tasks?project=p1";
const validTask = { title: "Tarea", description: "", assignee: "", dueDate: "", priority: "normal", status: "pending", assignees: [] };
const current = {
  id: "5f0c9b0e-6f9c-4e09-9f9e-9c0d1f3b5b6a",
  projectId: "p1",
  title: "Tarea",
  description: "",
  imageUrl: null,
  assignee: "",
  dueDate: "",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 1,
};
const project = () => ({ profiles: [], staff: [], removedProfiles: [], removedStaff: [], refs: [], members: [], identities: [] });
const request = (method: string, body: unknown) => new Request(endpoint, {
  method,
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("ruta de tareas", () => {
  beforeEach(() => {
    mocks.role = "admin";
    mocks.studentSection = null;
    mocks.status = "ok";
    mocks.rows = [current];
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.remove.mockReset();
    mocks.projectData.mockReset().mockResolvedValue(project());
    mocks.decorate.mockReset().mockReturnValue({ id: "t1" });
    mocks.create.mockResolvedValue({ ok: true, value: current });
    mocks.update.mockResolvedValue({ ok: true, value: { task: current, data: project() } });
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status).toBe(code);
    }
  });

  it("impide a un invitado crear tareas", async () => {
    mocks.role = "guest";
    const response = await POST(request("POST", validTask));
    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo de tarea inválido", async () => {
    const response = await POST(request("POST", {}));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("impide a un alumno asignar la tarea a otra persona", async () => {
    mocks.role = "student";
    mocks.studentSection = "s1";
    mocks.projectData.mockResolvedValueOnce({ ...project(), profiles: [{ section: "s2" }], staff: [] });
    const response = await POST(request("POST", { ...validTask, assignees: [{ kind: "student", profileId: "s2" }] }));
    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("crea una tarea válida para un administrador", async () => {
    const response = await POST(request("POST", validTask));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it("valida que el documento vinculado exista y esté activo", async () => {
    mocks.rows = [];
    let response = await POST(request("POST", { ...validTask, documentId: "doc1" }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();

    mocks.rows = [{ status: "archived" }];
    response = await POST(request("POST", { ...validTask, documentId: "doc1" }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();

    mocks.rows = [{ status: "active" }];
    response = await POST(request("POST", { ...validTask, documentId: "doc1" }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      value: expect.objectContaining({ documentId: "doc1" }),
    }));
  });

  it("devuelve 409 cuando la mutación detecta un conflicto de revisión", async () => {
    mocks.update.mockResolvedValueOnce({ ok: false, status: 409, message: "Esta tarea cambió en otra sesión." });
    const response = await PATCH(request("PATCH", {
      id: current.id,
      revision: current.revision,
      changes: { status: "done" },
    }));
    expect(response.status).toBe(409);
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
