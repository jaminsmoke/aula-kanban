import { Client } from "@modelcontextprotocol/sdk/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerWriteTools } from "./writes";

const projectId = "11111111-1111-4111-8111-111111111111";
const taskId = "44444444-4444-4444-8444-444444444444";
const user = { userId: "u1", email: "docente@example.org" };
const accessUser = { ...user, displayName: user.email, fullName: null };
const taskRow = { id: taskId, projectId, title: "Maqueta del proyecto", description: "", imageUrl: "", assignee: "", dueDate: "", priority: "normal", status: "pending", createdAt: 1794686200000, revision: 3, creatorUserId: null, creatorName: null };

const data = {
  profiles: [
    { section: "A", name: "Ana", displayName: null, activities: "", deleted: 0 },
    { section: "B", name: "Bruno", displayName: null, activities: "", deleted: 0 },
  ],
  staff: [{ id: "prof-1", name: "Profe", displayName: null, deleted: 0 }],
  removedProfiles: [],
  removedStaff: [],
  refs: [],
  members: [{ id: "m1", projectId, userId: "u1", role: "owner", status: "active" }],
  identities: [],
};

const createTask = vi.fn(async (_input: unknown) => ({ ok: true as const, value: { ...taskRow, revision: 1 } }));
const updateTask = vi.fn(async (_input: unknown) => ({ ok: true as const, value: { task: { ...taskRow, status: "active", revision: 4 }, data } }));
const deleteTask: ReturnType<typeof vi.fn<(_input: unknown) => Promise<{ ok: true; value: { id: string } } | { ok: false; status: number; message: string }>>> = vi.fn(async (_input: unknown) => ({ ok: true as const, value: { id: taskId } }));

vi.mock("../../../db", () => ({ getDb: vi.fn() }));
vi.mock("../project", () => ({ findProject: vi.fn(async (id: string) => ({ id })), projectAccessForUser: vi.fn(async () => ({ user: accessUser, role: "owner", studentSection: null, teacherId: null })) }));
vi.mock("../tasks/queries", () => ({ projectData: vi.fn(async () => data), decorate: vi.fn((row: Record<string, unknown>) => ({ ...row })) }));
vi.mock("../tasks/mutations", () => ({ createTask: (input: unknown) => createTask(input), updateTask: (input: unknown) => updateTask(input), deleteTask: (input: unknown) => deleteTask(input) }));

import { getDb } from "../../../db";
import { projectAccessForUser } from "../project";

function setDb(taskRows: unknown[] = [taskRow]) {
  const query = vi.fn(async () => taskRows);
  const rows = Object.assign(Promise.resolve(taskRows), { orderBy: () => query() });
  vi.mocked(getDb).mockReturnValue({ select: () => ({ from: () => ({ where: () => rows }) }) } as never);
  return query;
}

async function withClient(run: (client: Client) => Promise<void>) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerWriteTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await client.connect(clientTransport);
  try {
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

/**
 * Extrae el texto de la primera parte de la respuesta de la herramienta.
 * @param result - Resultado de la llamada `callTool`.
 * @returns El texto de la primera parte.
 */
function textOf(result: unknown) {
  const content = (result as { content: Array<{ text?: string }> }).content;
  return content?.[0]?.text ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  setDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("herramientas de escritura del MCP", () => {
  it("crear_tarea delega en createTask y devuelve la tarea con su enlace", async () => {
    await withClient(async (client) => {
      const result = await client.callTool({ name: "crear_tarea", arguments: { proyectoId: projectId, titulo: "Maqueta del proyecto", prioridad: "normal", estado: "pending" } });
      const body = JSON.parse(textOf(result)) as { tarea: Record<string, unknown> };
      expect(createTask).toHaveBeenCalledOnce();
      expect(createTask.mock.calls[0][0]).toMatchObject({
        projectId,
        value: expect.objectContaining({ title: "Maqueta del proyecto", priority: "normal", status: "pending" }),
        refs: [],
        memberId: "m1",
      });
      expect(body.tarea.revision).toBe(1);
      expect(body.tarea.enlace).toBe(`/?project=${projectId}`);
    });
  });

  it("una cuenta invitada no puede crear ni eliminar", async () => {
    vi.mocked(projectAccessForUser).mockResolvedValue({ user: accessUser, role: "guest", studentSection: null, teacherId: null });
    await withClient(async (client) => {
      const created = await client.callTool({ name: "crear_tarea", arguments: { proyectoId: projectId, titulo: "X", prioridad: "normal", estado: "pending" } });
      expect(created.isError).toBe(true);
      expect(textOf(created)).toContain("Las cuentas invitadas solo pueden consultar el proyecto.");
      const deleted = await client.callTool({ name: "eliminar_tarea", arguments: { proyectoId: projectId, tareaId: taskId } });
      expect(deleted.isError).toBe(true);
      expect(textOf(deleted)).toContain("Las cuentas invitadas solo pueden consultar el proyecto.");
      expect(createTask).not.toHaveBeenCalled();
      expect(deleteTask).not.toHaveBeenCalled();
    });
  });

  it("un alumno solo puede asignarse la tarea a sí mismo", async () => {
    vi.mocked(projectAccessForUser).mockResolvedValue({ user: accessUser, role: "student", studentSection: "A", teacherId: null });
    await withClient(async (client) => {
      const result = await client.callTool({ name: "crear_tarea", arguments: { proyectoId: projectId, titulo: "X", prioridad: "normal", estado: "pending", responsables: [{ kind: "student", profileId: "B" }] } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Solo puedes asignarte la tarea a ti o dejarla sin asignar.");
      expect(createTask).not.toHaveBeenCalled();
    });
  });

  it("crear_tarea sin responsables válidos responde el error de la API", async () => {
    await withClient(async (client) => {
      const result = await client.callTool({ name: "crear_tarea", arguments: { proyectoId: projectId, titulo: "X", prioridad: "normal", estado: "pending", responsables: [{ kind: "teacher", profileId: "inexistente" }] } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Selecciona responsables válidos de este proyecto.");
      expect(createTask).not.toHaveBeenCalled();
    });
  });

  it("actualizar_tarea solo con estado delega el cambio rápido con la revisión actual", async () => {
    await withClient(async (client) => {
      const result = await client.callTool({ name: "actualizar_tarea", arguments: { proyectoId: projectId, tareaId: taskId, estado: "active" } });
      expect(updateTask).toHaveBeenCalledOnce();
      expect(updateTask.mock.calls[0][0]).toMatchObject({ id: taskId, revision: 3, changes: { status: "active" } });
      expect(JSON.parse(textOf(result)).tarea.revision).toBe(4);
    });
  });

  it("actualizar_tarea con campos fusiona los valores actuales", async () => {
    await withClient(async (client) => {
      await client.callTool({ name: "actualizar_tarea", arguments: { proyectoId: projectId, tareaId: taskId, titulo: "Renombrada", revision: 3 } });
      expect(updateTask.mock.calls[0][0]).toMatchObject({ changes: expect.objectContaining({ title: "Renombrada", status: "pending" }) });
    });
  });

  it("actualizar_tarea de una tarea inexistente responde «No se encuentra la tarea.»", async () => {
    setDb([]);
    await withClient(async (client) => {
      const result = await client.callTool({ name: "actualizar_tarea", arguments: { proyectoId: projectId, tareaId: taskId, estado: "done" } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("No se encuentra la tarea.");
      expect(updateTask).not.toHaveBeenCalled();
    });
  });

  it("el fallo de negocio de deleteTask se devuelve como error con su mensaje", async () => {
    deleteTask.mockResolvedValueOnce({ ok: false, status: 403, message: "Solo puedes eliminar tareas asignadas únicamente a ti." });
    await withClient(async (client) => {
      const result = await client.callTool({ name: "eliminar_tarea", arguments: { proyectoId: projectId, tareaId: taskId } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("Solo puedes eliminar tareas asignadas únicamente a ti.");
    });
  });

  it("eliminar_tarea usa la revisión actual si se omite y responde el id", async () => {
    await withClient(async (client) => {
      const result = await client.callTool({ name: "eliminar_tarea", arguments: { proyectoId: projectId, tareaId: taskId } });
      expect(deleteTask).toHaveBeenCalledOnce();
      expect(deleteTask.mock.calls[0][0]).toMatchObject({ id: taskId, revision: 3 });
      expect(JSON.parse(textOf(result)).eliminada).toBe(taskId);
    });
  });
});
