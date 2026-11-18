import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Estas pruebas simulan D1 y cubren permisos/paridad; la transición tiene su propia suite SQLite.
vi.mock("../app-migration", () => ({ migrateLegacyAppInstall: async () => {}, migrateLegacyAppPreferences: async () => {} }));

/**
 * Paridad MCP ↔ HTTP (MCP-12): para cada operación, el mismo caso da el
 * mismo estado y el mismo mensaje por la herramienta que por la ruta.
 *
 * Las rutas (`app/api/tasks/route.ts`) devuelven los fallos de resolución
 * con `PROJECT_FAILURE_RESPONSES` y los de mutación tal cual
 * (`{ message, status }` de `lib/server/tasks/mutations.ts`); estos tests
 * comprueban que la herramienta expone lo mismo en
 * `structuredContent.error = { codigo, estado, mensaje }`.
 */

const projectId = "11111111-1111-4111-8111-111111111111";
const missingId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const projectRow = { id: projectId, name: "Proyecto uno", createdAt: 1 };
const taskRow = {
  id: taskId,
  projectId,
  title: "Tarea paridad",
  description: "",
  imageUrl: "",
  assignee: "",
  dueDate: "",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 2,
  creatorUserId: null,
  creatorMemberId: null,
  creatorName: null,
  mutationToken: null,
};

const data = {
  profiles: [{ section: "s1", name: "Ada", displayName: null, activities: "", deleted: 0 }],
  staff: [{ id: "t1", name: "Profe", displayName: null, deleted: 0 }],
  removedProfiles: [],
  removedStaff: [],
  refs: [],
  members: [
    { id: "m-owner", projectId, userId: "u-owner", role: "owner", status: "active" },
    { id: "m-guest", projectId, userId: "u-guest", role: "guest", status: "active" },
    { id: "m-student", projectId, userId: "u-student", role: "student", status: "active" },
  ],
  identities: [],
};

let rolActual: "owner" | "guest" | "student" | "sin_acceso" = "owner";

/** Fallo de mutación configurable por test (la ruta lo devuelve tal cual). */
let falloMutacion: { status: number; message: string } | null = null;

const identidad: Record<string, { userId: string; email: string }> = {
  owner: { userId: "u-owner", email: "owner@example.com" },
  guest: { userId: "u-guest", email: "guest@example.com" },
  student: { userId: "u-student", email: "student@example.com" },
  sin_acceso: { userId: "u-out", email: "out@example.com" },
};

vi.mock("../../../db", () => ({
  getDb: () => ({
    select: () => ({
      from: (table: object) => {
        const chain = (rows: unknown[]) => {
          const promise = Promise.resolve(rows) as Promise<unknown[]> & { where: () => unknown; orderBy: () => unknown; innerJoin: () => unknown };
          promise.where = () => promise;
          promise.orderBy = () => promise;
          promise.innerJoin = () => promise;
          return promise;
        };
        if (table === projectsTable) return chain([projectRow]);
        if (table === taskRowsTable) return chain([taskRow]);
        if (table === instanceAppsTable) return chain([{ appId: "mermaid", installed: 1, version: "1.0.0" }, { appId: "calculadora", installed: 1, version: "1.0.0" }]);
        return chain([]);
      },
    }),
    delete: () => ({ where: () => Promise.resolve() }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ section: "s1", id: "t1", projectId, name: "Ada", displayName: "Ada", role: "", activities: "", aiHelp: "", deleted: 0, revision: 2, mutationToken: null }]),
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve(retornoAceptar) }) }) }),
  }),
}));

/** Filas que devuelve el UPDATE de aceptación (`[]` = invitación ajena). */
let retornoAceptar: unknown[] = [];

vi.mock("../project-access", () => ({
  isOwner: async (user: { userId: string }) => user.userId === "u-owner",
  isAdministrator: async () => false,
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  findProject: async (id: string) => (id === projectId ? projectRow : null),
  projectAccessForUser: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "owner") return { user: { ...user, displayName: user.email, fullName: null }, role: "owner", studentSection: null, teacherId: null };
    if (rolActual === "guest") return { user: { ...user, displayName: user.email, fullName: null }, role: "guest", studentSection: null, teacherId: null };
    if (rolActual === "student") return { user: { ...user, displayName: user.email, fullName: null }, role: "student", studentSection: "s1", teacherId: null };
    return null;
  },
  globalRoleForUser: async (user: { userId: string }) => (user.userId === "u-owner" ? "owner" : null),
  memberAccess: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "guest") return { user: { ...user, displayName: user.email, fullName: null }, role: "guest", studentSection: null, teacherId: null };
    if (rolActual === "student") return { user: { ...user, displayName: user.email, fullName: null }, role: "student", studentSection: "s1", teacherId: null };
    return null;
  },
}));

vi.mock("../tasks/queries", () => ({
  projectData: async () => data,
  decorate: (row: Record<string, unknown>) => ({ ...row }),
}));

vi.mock("../tasks/mutations", () => ({
  createTask: async () => (falloMutacion ? { ok: false as const, ...falloMutacion } : { ok: true as const, value: { ...taskRow, revision: 1 } }),
  updateTask: async () => (falloMutacion ? { ok: false as const, ...falloMutacion } : { ok: true as const, value: { task: { ...taskRow, status: "active", revision: 3 }, data } }),
  deleteTask: async () => (falloMutacion ? { ok: false as const, ...falloMutacion } : { ok: true as const, value: { id: taskId } }),
}));

import { instanceApps as instanceAppsTable, projects as projectsTable, tasks as taskRowsTable } from "../../../db/schema";
import { registerTools } from "./registro";

async function llamar(tool: string, user: { userId: string; email: string }, args: Record<string, unknown>) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    return await client.callTool({ name: tool, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

function errorDe(result: Awaited<ReturnType<typeof llamar>>) {
  return (result.structuredContent as { error: { codigo: string; estado: number; mensaje: string } }).error;
}


describe("paridad MCP ↔ HTTP", () => {
  it("un proyecto inexistente da el 404 del contrato en ambas vías", async () => {
    rolActual = "owner";
    const result = await llamar("listar_tareas", identidad.owner, { proyectoId: missingId });
    expect(result.isError).toBe(true);
    expect(errorDe(result)).toEqual({ codigo: "not_found", estado: 404, mensaje: "No se encuentra el proyecto." });
  });

  it("un proyecto sin acceso da el 403 del contrato en ambas vías", async () => {
    rolActual = "sin_acceso";
    const result = await llamar("listar_tareas", identidad.sin_acceso, { proyectoId: projectId });
    expect(errorDe(result)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "No tienes acceso a este proyecto." });
  });

  it("un invitado que escribe recibe el mismo 403 de la ruta", async () => {
    rolActual = "guest";
    const result = await llamar("crear_tarea", identidad.guest, { proyectoId: projectId, titulo: "X", prioridad: "normal", estado: "pending" });
    expect(errorDe(result)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Las cuentas invitadas solo pueden consultar el proyecto." });
  });

  it("un alumno con responsable ajeno recibe el mismo 403 de la ruta", async () => {
    rolActual = "student";
    const result = await llamar("crear_tarea", identidad.student, { proyectoId: projectId, titulo: "X", responsable: "otro", prioridad: "normal", estado: "pending" });
    expect(errorDe(result)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." });
  });

  it("un conflicto de revisión expone estado y mensaje de la mutación", async () => {
    rolActual = "owner";
    falloMutacion = { status: 409, message: "Esta tarea cambió en otra sesión." };
    const result = await llamar("actualizar_tarea", identidad.owner, { proyectoId: projectId, tareaId: taskId, revision: 99, estado: "done" });
    expect(result.isError).toBe(true);
    expect(errorDe(result)).toMatchObject({ codigo: "conflict", estado: 409, mensaje: "Esta tarea cambió en otra sesión." });
    falloMutacion = null;
  });

  it("obtener_enlace sin acceso da el 403 del contrato en ambas vías", async () => {
    rolActual = "sin_acceso";
    const result = await llamar("obtener_enlace", identidad.sin_acceso, { proyectoId: projectId });
    expect(errorDe(result)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "No tienes acceso a este proyecto." });
  });

  it("obtener_enlace a un proyecto inexistente da el 404 del contrato", async () => {
    rolActual = "owner";
    const result = await llamar("obtener_enlace", identidad.owner, { proyectoId: missingId });
    expect(errorDe(result)).toEqual({ codigo: "not_found", estado: 404, mensaje: "No se encuentra el proyecto." });
  });

  it("aceptar una invitación ajena da el mismo 404 de la ruta", async () => {
    rolActual = "owner";
    retornoAceptar = [];
    const result = await llamar("aceptar_invitacion", identidad.owner, { id: "123e4567-e89b-42d3-a456-426614174001", ambito: "project" });
    expect(errorDe(result)).toEqual({ codigo: "not_found", estado: 404, mensaje: "La invitación ya no está disponible para esta cuenta." });
  });

  it("aceptar una invitación propia devuelve el proyecto aceptado", async () => {
    rolActual = "owner";
    retornoAceptar = [{ projectId }];
    const result = await llamar("aceptar_invitacion", identidad.owner, { id: "123e4567-e89b-42d3-a456-426614174001", ambito: "project" });
    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as { aceptada?: boolean }).aceptada).toBe(true);
  });

  it("asignar referencias inválidas da el mismo 400 de la validación compartida", async () => {
    rolActual = "owner";
    const result = await llamar("asignar_tarea", identidad.owner, { proyectoId: projectId, tareaId: taskId, responsables: [{ kind: "student", profileId: "inexistente" }] });
    expect(errorDe(result)).toEqual({ codigo: "invalid", estado: 400, mensaje: "Selecciona responsables válidos de este proyecto." });
  });

  it("mover/reprogramar exponen el conflicto 409 de la mutación", async () => {
    rolActual = "owner";
    falloMutacion = { status: 409, message: "Esta tarea cambió en otra sesión." };
    const mover = await llamar("mover_tarea", identidad.owner, { proyectoId: projectId, tareaId: taskId, estado: "done" });
    expect(errorDe(mover)).toMatchObject({ codigo: "conflict", estado: 409, mensaje: "Esta tarea cambió en otra sesión." });
    const reprogramar = await llamar("reprogramar_tarea", identidad.owner, { proyectoId: projectId, tareaId: taskId, vencimiento: "2026-11-20" });
    expect(errorDe(reprogramar)).toMatchObject({ codigo: "conflict", estado: 409, mensaje: "Esta tarea cambió en otra sesión." });
    falloMutacion = null;
  });

  it("el calendario fuera de 92 días da el 400 del contrato", async () => {
    rolActual = "owner";
    const result = await llamar("listar_calendario", identidad.owner, { proyectoId: projectId, desde: "2026-11-14", hasta: "2027-06-01" });
    expect(errorDe(result)).toMatchObject({ codigo: "invalid", estado: 400 });
  });

  it("abrir_app responde con el enlace profundo en el contrato correcto", async () => {
    rolActual = "owner";
    const result = await llamar("abrir_app", identidad.owner, { proyectoId: projectId, appId: "mermaid" });
    expect(result.isError).toBeUndefined();
    const enlace = (result.structuredContent as { enlace: string }).enlace;
    expect(enlace).toContain("view=administracion&section=tienda");
    expect(enlace).toContain("app=mermaid");
  });

  it("abrir_app acepta el alias edu-tools y devuelve el id nuevo", async () => {
    rolActual = "owner";
    const result = await llamar("abrir_app", identidad.owner, { proyectoId: projectId, appId: "edu-tools" });
    expect(result.isError).toBeUndefined();
    const enlace = (result.structuredContent as { enlace: string }).enlace;
    expect(enlace).toContain("app=calculadora");
    expect(enlace).not.toContain("app=edu-tools");
  });

  it("ventanas sin pestaña conectada: unavailable con enlace, sin error", async () => {
    rolActual = "owner";
    const listar = await llamar("listar_ventanas", identidad.owner, { proyectoId: projectId });
    expect(listar.isError).toBeUndefined();
    const estado = listar.structuredContent as { conectadas: boolean; ventanas: unknown[]; enlace: string };
    expect(estado.conectadas).toBe(false);
    expect(estado.ventanas).toEqual([]);
    expect(estado.enlace).toContain("view=administracion&section=tienda");
    const cerrar = await llamar("cerrar_app", identidad.owner, { proyectoId: projectId, appId: "mermaid" });
    expect(cerrar.isError).toBeUndefined();
    const control = cerrar.structuredContent as { ventana_entregada: boolean; enlace: string };
    expect(control.ventana_entregada).toBe(false);
    expect(control.enlace).toContain("app=mermaid");
  });

  it("instalar/desinstalar apps da el mismo 403 de la ruta para roles no gestores", async () => {
    rolActual = "student";
    const instalar = await llamar("instalar_app", identidad.student, { appId: "mermaid" });
    expect(errorDe(instalar)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo el propietario o un administrador pueden gestionar aplicaciones." });
    const desinstalar = await llamar("desinstalar_app", identidad.student, { appId: "mermaid", confirmar: true });
    expect(errorDe(desinstalar)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo el propietario o un administrador pueden gestionar aplicaciones." });
  });

  it("listar_apps devuelve el catálogo completo con estados", async () => {
    rolActual = "owner";
    const result = await llamar("listar_apps", identidad.owner, {});
    expect(result.isError).toBeUndefined();
    const apps = (result.structuredContent as { apps: Array<{ id: string; estado: string }> }).apps;
    expect(apps.map((app) => app.id)).toEqual(["excalidraw", "calculadora", "tabla-periodica", "blockly", "mermaid", "ajedrez", "tarjetas", "fisica", "geometria", "mapas", "presentaciones", "moleculas", "timeline", "hoja-calculo", "documentos", "visor-office", "aula-documentos"]);
    for (const app of apps) {
      expect(["installed", "not_installed"]).toContain(app.estado);
    }
  });

  it("desinstalar sin confirmar avisa y no desinstala", async () => {
    rolActual = "owner";
    const result = await llamar("desinstalar_app", identidad.owner, { appId: "mermaid" });
    expect(result.isError).toBeUndefined();
    const contenido = result.structuredContent as { necesitaConfirmacion?: boolean; mensaje?: string };
    expect(contenido.necesitaConfirmacion).toBe(true);
    expect(contenido.mensaje).toContain("conservan");
  });

  it("un fallo de negocio de creación expone estado y mensaje de la mutación", async () => {
    rolActual = "owner";
    falloMutacion = { status: 403, message: "Ya no tienes permiso para crear tareas." };
    const result = await llamar("crear_tarea", identidad.owner, { proyectoId: projectId, titulo: "X", prioridad: "normal", estado: "pending" });
    expect(errorDe(result)).toMatchObject({ codigo: "forbidden", estado: 403, mensaje: "Ya no tienes permiso para crear tareas." });
    falloMutacion = null;
  });
});
