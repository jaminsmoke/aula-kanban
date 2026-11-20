import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const owner = { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null };
const student = { userId: "u2", email: "alumno@example.com", displayName: "Alumno", fullName: null };

const projectRow = { id: "11111111-1111-4111-8111-111111111111", name: "Proyecto uno", createdAt: 1 };
const taskRow = {
  id: "44444444-4444-4444-8444-444444444444",
  projectId: "11111111-1111-4111-8111-111111111111",
  title: "Maqueta del proyecto",
  description: "Primera entrega",
  assignee: "Ada",
  dueDate: "2026-11-20",
  priority: "high",
  status: "active",
  imageUrl: "",
  createdAt: 1,
  revision: 3,
  creatorUserId: "u1",
  creatorMemberId: null,
  creatorName: null,
  mutationToken: null,
};

vi.mock("../../../db", () => ({
  getDb: () => ({
    select: () => ({
      from: (table: object) => {
        if (table === projectsTable) return query([projectRow]);
        if (table === taskRowsTable) return query([taskRow]);
        if (table === studentsTable) return query([
          { section: "s1", projectId: "11111111-1111-4111-8111-111111111111", name: "Ada", displayName: "Ada", role: "", activities: "lectura", aiHelp: "", deleted: 0, revision: 1, mutationToken: null },
          { section: "s2", projectId: "11111111-1111-4111-8111-111111111111", name: "Grace", displayName: "Grace", role: "", activities: "", aiHelp: "", deleted: 0, revision: 2, mutationToken: null },
        ]);
        if (table === teachersTable) return query([{ id: "tch", projectId: "11111111-1111-4111-8111-111111111111", name: "Profe", displayName: "Profe", role: "teacher", activities: "", aiHelp: "", revision: 1, mutationToken: null }]);
        return query([]);
      },
    }),
  }),
}));

import { projects as projectsTable, students as studentsTable, tasks as taskRowsTable, teachers as teachersTable } from "../../../db/schema";

function query(rows: unknown[]) {
  const chain = Promise.resolve(rows) as Promise<unknown[]> & { where: () => unknown; orderBy: () => unknown };
  chain.where = () => chain;
  chain.orderBy = () => chain;
  return chain;
}

vi.mock("../projects/project-access", () => ({
  findProject: async (id: string) => (id === "11111111-1111-4111-8111-111111111111" ? projectRow : null),
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  projectAccessForUser: async (id: string, user: { userId: string }) => {
    if (id !== "11111111-1111-4111-8111-111111111111") return null;
    if (user.userId === "u1") return { user, role: "owner", studentSection: null, teacherId: null };
    if (user.userId === "u2") return { user, role: "student", studentSection: "s1", teacherId: null };
    return null;
  },
  globalRoleForUser: async (user: { userId: string }) => (user.userId === "u1" ? "owner" : null),
  memberAccess: async (id: string, user: { userId: string }) => {
    if (id !== "11111111-1111-4111-8111-111111111111") return null;
    if (user.userId === "u1") return { user, role: "owner", studentSection: null, teacherId: null };
    if (user.userId === "u2") return { user, role: "student", studentSection: "s1", teacherId: null };
    return null;
  },
}));

vi.mock("../tasks/queries", () => ({
  projectData: async () => ({ profiles: [], staff: [], removedProfiles: [], removedStaff: [], refs: [], members: [], identities: [] }),
  decorate: (row: typeof taskRow) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    assignee: row.assignee,
    assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
    dueDate: row.dueDate,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt,
    revision: row.revision,
    creator: "Docente",
  }),
}));

import { registerReadTools } from "./reads";

async function withClient<T>(user: typeof owner, run: (client: Client) => Promise<T>): Promise<T> {
  const server = new McpServer({ name: "aula-kanban", version: "0.1.0" });
  registerReadTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  // InMemoryTransport permite inyectar la identidad que tendría la petición HTTP.
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    return await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const first = (result.content as Array<{ type: string; text?: string }>)[0];
  if (first.type !== "text") return null;
  try {
    return JSON.parse(first.text ?? "null");
  } catch {
    throw new Error(`contenido no JSON: ${first.text}`);
  }
}

describe("herramientas de lectura del MCP", () => {
  it("lista proyectos solo con los que la cuenta puede ver", async () => {
    await withClient(owner, async (client) => {
      const result = await client.callTool({ name: "listar_proyectos", arguments: {} });
      expect((textOf(result) as { proyectos: Array<{ id: string; rol: string; enlace: string }> }).proyectos).toEqual([
        { id: "11111111-1111-4111-8111-111111111111", nombre: "Proyecto uno", rol: "owner", enlace: "/?project=11111111-1111-4111-8111-111111111111", calendario: "/?project=11111111-1111-4111-8111-111111111111&section=calendario" },
      ]);
    });
    await withClient(student, async (client) => {
      const result = await client.callTool({ name: "listar_proyectos", arguments: {} });
      expect((textOf(result) as { proyectos: Array<{ rol: string }> }).proyectos[0].rol).toBe("student");
    });
    await withClient({ userId: "u9", email: "fuera@example.com", displayName: "", fullName: null }, async (client) => {
      const result = await client.callTool({ name: "listar_proyectos", arguments: {} });
      expect(textOf(result)).toEqual({ proyectos: [], total: 0, pagina: 1, porPagina: 50 });
    });
  });

  it("lista y obtiene tareas con filtros y paginación como el tablero", async () => {
    await withClient(owner, async (client) => {
      const listed = await client.callTool({ name: "listar_tareas", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } });
      const body = textOf(listed) as { tareas: Array<Record<string, unknown>>; total: number };
      expect(body.total).toBe(1);
      expect(body.tareas[0]).toMatchObject({ id: "44444444-4444-4444-8444-444444444444", title: "Maqueta del proyecto", revision: 3, enlace: "/?project=11111111-1111-4111-8111-111111111111" });

      const none = await client.callTool({ name: "listar_tareas", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", estado: "done" } });
      expect((textOf(none) as { total: number }).total).toBe(0);

      const one = await client.callTool({ name: "obtener_tarea", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", tareaId: "44444444-4444-4444-8444-444444444444" } });
      const oneBody = textOf(one) as { tarea: Record<string, unknown> };
      expect(oneBody.tarea).toMatchObject({ id: "44444444-4444-4444-8444-444444444444", calendario: "/?project=11111111-1111-4111-8111-111111111111&section=calendario" });

      const missing = await client.callTool({ name: "obtener_tarea", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", tareaId: "otro" } });
      expect(missing.isError).toBe(true);
    });
  });

  it("responde 404 y 403 como la API HTTP", async () => {
    await withClient(owner, async (client) => {
      const missing = await client.callTool({ name: "listar_tareas", arguments: { proyectoId: "33333333-3333-4333-8333-333333333333" } });
      expect(missing.isError).toBe(true);
      const first = (missing.content as Array<{ type: string; text?: string }>)[0];
      expect(first.text).toBe("No se encuentra el proyecto.");
    });
    await withClient({ userId: "u9", email: "fuera@example.com", displayName: "", fullName: null }, async (client) => {
      const denied = await client.callTool({ name: "listar_tareas", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } });
      const first = (denied.content as Array<{ type: string; text?: string }>)[0];
      expect(first.text).toBe("No tienes acceso a este proyecto.");
    });
  });

  it("lista alumnado y profesorado activos con rol, revisión y estado de cuenta", async () => {
    await withClient(owner, async (client) => {
      const students = await client.callTool({ name: "listar_alumnos", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } });
      expect(textOf(students)).toEqual({
        alumnos: [
          { seccion: "s1", nombre: "Ada", nombreVisible: "Ada", rol: "", actividad: "lectura", ayudaIA: "", revision: 1, estadoCuenta: "unlinked", correoCuenta: "" },
          { seccion: "s2", nombre: "Grace", nombreVisible: "Grace", rol: "", actividad: "", ayudaIA: "", revision: 2, estadoCuenta: "unlinked", correoCuenta: "" },
        ],
        total: 2,
        pagina: 1,
        porPagina: 50,
      });
      const teachers = await client.callTool({ name: "listar_profesores", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } });
      expect(textOf(teachers)).toEqual({
        profesores: [{ id: "tch", nombre: "Profe", nombreVisible: "Profe", rol: "teacher", actividad: "", ayudaIA: "", revision: 1, estadoCuenta: "unlinked", correoCuenta: "" }],
        total: 1,
        pagina: 1,
        porPagina: 50,
      });
    });
  });

  it("oculta el correo de las fichas ajenas al alumnado", async () => {
    await withClient(student, async (client) => {
      const result = await client.callTool({ name: "listar_alumnos", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111" } });
      const alumnos = (textOf(result) as { alumnos: Array<Record<string, unknown>> }).alumnos;
      expect(alumnos[0]).toHaveProperty("correoCuenta", "");
      expect(alumnos[1]).not.toHaveProperty("correoCuenta");
    });
  });

  it("obtiene una ficha concreta y responde 404 si no existe", async () => {
    await withClient(owner, async (client) => {
      const alumno = await client.callTool({ name: "obtener_alumno", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", seccion: "s2" } });
      expect(textOf(alumno)).toEqual({ alumno: { seccion: "s2", nombre: "Grace", nombreVisible: "Grace", rol: "", actividad: "", ayudaIA: "", revision: 2, estadoCuenta: "unlinked", correoCuenta: "" } });

      const profesor = await client.callTool({ name: "obtener_profesor", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", profesorId: "tch" } });
      expect(textOf(profesor)).toEqual({ profesor: { id: "tch", nombre: "Profe", nombreVisible: "Profe", rol: "teacher", actividad: "", ayudaIA: "", revision: 1, estadoCuenta: "unlinked", correoCuenta: "" } });

      const missing = await client.callTool({ name: "obtener_alumno", arguments: { proyectoId: "11111111-1111-4111-8111-111111111111", seccion: "s9" } });
      expect(missing.isError).toBe(true);
      expect((missing.content as Array<{ type: string; text?: string }>)[0].text).toBe("No se encuentra la ficha en este proyecto.");
    });
  });
});
