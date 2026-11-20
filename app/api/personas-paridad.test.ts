import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Paridad MCP ↔ HTTP de las fichas de personas (MCP-06): la ruta y la
 * herramienta comparten `lib/server/people/`, así que devuelven la misma
 * ficha y los mismos 403/404/409. Vive en `app/` porque solo esta capa puede
 * importar las dos orillas.
 */

const projectId = "11111111-1111-4111-8111-111111111111";
const missingId = "33333333-3333-4333-8333-333333333333";
const teacherId = "123e4567-e89b-42d3-a456-426614174001";
const studentSeccion = "s1";
const memberId = "66666666-6666-4666-8666-666666666666";
const otherMemberId = "77777777-7777-4777-8777-777777777777";

type Rol = "owner" | "student" | "teacher" | "sin_acceso";
let rolActual: Rol = "owner";
/** Fallo configurable de la edición compartida (la ruta lo devuelve tal cual). */
let falloPerfil: { status: number; message: string } | null = null;

/** Miembros que devuelve el mock; cada prueba puede acotar la lista. */
const filasMiembros = [
  { id: memberId, projectId, userId: "u-student", email: "ada@example.com", role: "student", studentSection: "s1", teacherId: null, status: "active" },
  { id: otherMemberId, projectId, userId: "u-teacher", email: "profe@example.com", role: "teacher", studentSection: null, teacherId, status: "pending" },
  { id: "m-t2", projectId, userId: "u-other", email: "otro@example.com", role: "teacher", studentSection: null, teacherId: "t2", status: "pending" },
];
let miembrosActuales = filasMiembros;

const identidad: Record<Rol, { userId: string; email: string }> = {
  owner: { userId: "u-owner", email: "owner@example.com" },
  student: { userId: "u-student", email: "student@example.com" },
  teacher: { userId: "u-teacher", email: "teacher@example.com" },
  sin_acceso: { userId: "u-out", email: "out@example.com" },
};

vi.mock("../../db", () => ({
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
        if (table === projectsTable) return chain([{ id: projectId, name: "Proyecto uno", createdAt: 1 }]);
        if (table === studentsTable) return chain([
          { section: "s1", projectId, name: "Ada", displayName: "Ada", role: "student", activities: "lectura", aiHelp: "", deleted: 0, revision: 2, mutationToken: null },
          { section: "s2", projectId, name: "Grace", displayName: "Grace", role: "student", activities: "", aiHelp: "", deleted: 0, revision: 1, mutationToken: null },
        ]);
        if (table === teachersTable) return chain([{ id: teacherId, projectId, name: "Profe", displayName: "Profe", role: "teacher", activities: "", aiHelp: "", revision: 3, mutationToken: null }]);
        if (table === projectMembersTable) return chain(miembrosActuales);
        return chain([]);
      },
    }),
    delete: () => ({ where: () => ({ returning: () => Promise.resolve([{ id: memberId }]) }) }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ section: "s1", id: teacherId, projectId, name: "Ada", displayName: "Ada", role: "", activities: "", aiHelp: "", deleted: 0, revision: 2, mutationToken: null }]),
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }),
  }),
}));

vi.mock("../../lib/server/projects/project-access", () => ({
  isOwner: async (user: { userId: string }) => user.userId === "u-owner",
  isAdministrator: async () => false,
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  findProject: async (id: string) => (id === projectId ? { id: projectId, name: "Proyecto uno", createdAt: 1 } : null),
  projectAccessForUser: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "sin_acceso") return null;
    return { user: { ...user, displayName: user.email, fullName: null }, role: rolActual, studentSection: rolActual === "student" ? studentSeccion : null, teacherId: rolActual === "teacher" ? teacherId : null };
  },
  globalRoleForUser: async (user: { userId: string }) => (user.userId === "u-owner" ? "owner" : null),
  memberAccess: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "sin_acceso") return null;
    return { user: { ...user, displayName: user.email, fullName: null }, role: rolActual, studentSection: rolActual === "student" ? studentSeccion : null, teacherId: rolActual === "teacher" ? teacherId : null };
  },
  resolveProject: async (request: Request) => {
    const id = new URL(request.url).searchParams.get("project") || "default";
    if (id !== projectId) return { status: "not_found" };
    if (rolActual === "sin_acceso") return { status: "forbidden" };
    return {
      status: "ok",
      project: {
        id: projectId,
        name: "Proyecto uno",
        createdAt: 1,
        access: { user: { ...identidad[rolActual], displayName: "owner@example.com", fullName: null }, role: rolActual, studentSection: rolActual === "student" ? studentSeccion : null, teacherId: rolActual === "teacher" ? teacherId : null },
      },
    };
  },
  projectFailureResponse: (status: "unauthenticated" | "invalid" | "not_found" | "forbidden") => {
    const fallos = {
      unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
      invalid: { status: 400, message: "Proyecto no válido." },
      not_found: { status: 404, message: "No se encuentra el proyecto." },
      forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
    } as const;
    return Response.json({ message: fallos[status].message }, { status: fallos[status].status });
  },
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    DB: {
      prepare: () => ({ bind: () => ({}) }),
      batch: async () => [{ results: [{ section: studentSeccion, id: teacherId }] }, { results: [] }, { results: [] }],
    },
  },
}));

vi.mock("../../lib/server/access/profile-update", () => ({
  updateProfile: async () => (falloPerfil ? { ok: false as const, ...falloPerfil } : { ok: true as const }),
}));

vi.mock("../../lib/server/tasks/queries", () => ({
  projectData: async () => ({ profiles: [], staff: [], removedProfiles: [], removedStaff: [], refs: [], members: [], identities: [] }),
  decorate: (row: Record<string, unknown>) => ({ ...row }),
}));

vi.mock("../../lib/server/tasks/mutations", () => ({
  createTask: async () => ({ ok: true as const, value: {} }),
  updateTask: async () => ({ ok: true as const, value: { task: {}, data: {} } }),
  deleteTask: async () => ({ ok: true as const, value: { id: "" } }),
}));

import { projectMembers as projectMembersTable, projects as projectsTable, students as studentsTable, teachers as teachersTable } from "../../db/schema";
import { DELETE as retirarMiembroHttp, GET as miembrosHttp, POST as invitarMiembroHttp } from "./members/route";
import { DELETE as eliminarAlumnoHttp, GET as alumnosHttp, PATCH as actualizarAlumnoHttp, POST as crearAlumnoHttp } from "./students/route";
import { DELETE as eliminarProfesorHttp, GET as profesoresHttp, PATCH as actualizarProfesorHttp, POST as crearProfesorHttp } from "./teachers/route";
import { registerTools } from "../../lib/server/mcp/registro";

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

/**
 * Petición de mutación por la ruta HTTP: mismo origen y JSON, como la web.
 * @param url - URL de la ruta con el proyecto.
 * @param method - `POST` o `PATCH`.
 * @param body - Cuerpo de la ficha.
 * @returns La petición lista para el manejador de la ruta.
 */
function mutacion(url: string, method: "POST" | "PATCH" | "DELETE", body: unknown) {
  return new Request(url, { method, headers: { origin: "https://site.test", "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("paridad MCP ↔ HTTP de fichas de personas", () => {
  it("la ficha de alumnado coincide por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await alumnosHttp(new Request(`https://site.test/api/students?project=${projectId}`));
    expect(http.status).toBe(200);
    const rows = (await http.json()) as Array<Record<string, unknown>>;
    const s1 = rows.find((row) => row.section === "s1") as Record<string, unknown>;
    const mcp = await llamar("obtener_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1" });
    expect(mcp.structuredContent).toEqual({
      alumno: {
        seccion: s1.section,
        nombre: s1.displayName || s1.name,
        nombreVisible: s1.displayName,
        rol: s1.role,
        actividad: s1.activities,
        ayudaIA: s1.aiHelp,
        revision: s1.revision,
        estadoCuenta: s1.accountStatus,
        correoCuenta: s1.accountEmail,
      },
    });
  });

  it("la ficha de profesorado coincide por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await profesoresHttp(new Request(`https://site.test/api/teachers?project=${projectId}`));
    expect(http.status).toBe(200);
    const rows = (await http.json()) as Array<Record<string, unknown>>;
    const t1 = rows[0];
    const mcp = await llamar("obtener_profesor", identidad.owner, { proyectoId: projectId, profesorId: teacherId });
    expect(mcp.structuredContent).toEqual({
      profesor: {
        id: t1.id,
        nombre: t1.displayName || t1.name,
        nombreVisible: t1.displayName,
        rol: t1.role,
        actividad: t1.activities,
        ayudaIA: t1.aiHelp,
        revision: t1.revision,
        estadoCuenta: t1.accountStatus,
        correoCuenta: t1.accountEmail,
      },
    });
  });

  it("el correo de una ficha ajena se oculta igual por MCP y por la ruta", async () => {
    rolActual = "student";
    const http = await alumnosHttp(new Request(`https://site.test/api/students?project=${projectId}`));
    const rows = (await http.json()) as Array<Record<string, unknown>>;
    const ajena = rows.find((row) => row.section === "s2") as Record<string, unknown>;
    expect(ajena.accountEmail).toBeUndefined();
    const mcp = await llamar("listar_alumnos", identidad.student, { proyectoId: projectId });
    const alumnos = (mcp.structuredContent as { alumnos: Array<Record<string, unknown>> }).alumnos;
    expect(alumnos.find((item) => item.seccion === "s2")).not.toHaveProperty("correoCuenta");
  });

  it("un proyecto inexistente y uno sin acceso dan el mismo contrato por MCP y por la ruta", async () => {
    rolActual = "owner";
    const missing = await alumnosHttp(new Request(`https://site.test/api/students?project=${missingId}`));
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { message: string }).message).toBe("No se encuentra el proyecto.");
    const mcpMissing = await llamar("listar_alumnos", identidad.owner, { proyectoId: missingId });
    expect(errorDe(mcpMissing)).toEqual({ codigo: "not_found", estado: 404, mensaje: "No se encuentra el proyecto." });

    rolActual = "sin_acceso";
    const denied = await profesoresHttp(new Request(`https://site.test/api/teachers?project=${projectId}`));
    expect(denied.status).toBe(403);
    expect(((await denied.json()) as { message: string }).message).toBe("No tienes acceso a este proyecto.");
    const mcpDenied = await llamar("listar_profesores", identidad.sin_acceso, { proyectoId: projectId });
    expect(errorDe(mcpDenied)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "No tienes acceso a este proyecto." });
  });

  it("crear una ficha de alumnado da el mismo resultado por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await crearAlumnoHttp(mutacion(`https://site.test/api/students?project=${projectId}`, "POST", {
      name: "Ada",
      displayName: "Ada",
      role: "",
      activities: "",
      aiHelp: "",
      section: "123e4567-e89b-42d3-a456-426614174000",
      accountEmail: "",
    }));
    expect(http.status).toBe(201);
    const row = (await http.json()) as Record<string, unknown>;
    const mcp = await llamar("crear_alumno", identidad.owner, { proyectoId: projectId, nombre: "Ada" });
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { alumno: Record<string, unknown> }).alumno).toMatchObject({
      nombreVisible: row.displayName,
      revision: row.revision,
      estadoCuenta: row.accountStatus,
      correoCuenta: row.accountEmail,
    });
  });

  it("actualizar una ficha de alumnado coincide por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await actualizarAlumnoHttp(mutacion(`https://site.test/api/students?project=${projectId}`, "PATCH", {
      section: "s1",
      revision: 2,
      name: "Ada Lovelace",
      displayName: "Ada Lovelace",
      role: "",
      activities: "lectura",
      aiHelp: "",
      accountEmail: "",
    }));
    expect(http.status).toBe(200);
    const row = (await http.json()) as Record<string, unknown>;
    const mcp = await llamar("actualizar_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1", revision: 2, nombre: "Ada Lovelace" });
    const ficha = (mcp.structuredContent as { alumno: Record<string, unknown> }).alumno;
    expect(ficha.nombre).toBe(row.displayName || row.name);
    expect(ficha.revision).toBe(row.revision);
    expect(ficha.estadoCuenta).toBe(row.accountStatus);
  });

  it("crear y actualizar profesorado coinciden por MCP y por la ruta", async () => {
    rolActual = "owner";
    const creado = await crearProfesorHttp(mutacion(`https://site.test/api/teachers?project=${projectId}`, "POST", {
      id: "123e4567-e89b-42d3-a456-426614174002",
      name: "Profe",
      displayName: "Profe",
      role: "teacher",
      activities: "",
      aiHelp: "",
      accountEmail: "",
    }));
    expect(creado.status).toBe(201);
    const alta = await llamar("crear_profesor", identidad.owner, { proyectoId: projectId, nombre: "Profe" });
    expect(alta.isError).toBeUndefined();
    expect((alta.structuredContent as { profesor: Record<string, unknown> }).profesor.estadoCuenta).toBe("unlinked");

    const http = await actualizarProfesorHttp(mutacion(`https://site.test/api/teachers?project=${projectId}`, "PATCH", {
      id: teacherId,
      revision: 3,
      name: "Profe",
      displayName: "Profe",
      role: "teacher",
      activities: "",
      aiHelp: "",
      accountEmail: "",
    }));
    expect(http.status).toBe(200);
    const row = (await http.json()) as Record<string, unknown>;
    const mcp = await llamar("actualizar_profesor", identidad.owner, { proyectoId: projectId, profesorId: teacherId, revision: 3, nombre: "Profe" });
    const ficha = (mcp.structuredContent as { profesor: Record<string, unknown> }).profesor;
    expect(ficha.id).toBe(row.id);
    expect(ficha.revision).toBe(row.revision);
    expect(ficha.estadoCuenta).toBe(row.accountStatus);
  });

  it("una revisión vieja da el mismo 409 por MCP y por la ruta", async () => {
    rolActual = "owner";
    falloPerfil = { status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
    const http = await actualizarAlumnoHttp(mutacion(`https://site.test/api/students?project=${projectId}`, "PATCH", {
      section: "s1",
      revision: 1,
      name: "Ada",
      displayName: "Ada",
      role: "",
      activities: "",
      aiHelp: "",
      accountEmail: "",
    }));
    expect(http.status).toBe(409);
    expect(((await http.json()) as { message: string }).message).toBe("La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo.");
    const mcp = await llamar("actualizar_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1", revision: 1, nombre: "Ada" });
    expect(errorDe(mcp)).toEqual({ codigo: "conflict", estado: 409, mensaje: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." });
    falloPerfil = null;
  });

  it("la lista de miembros coincide por MCP y por la ruta y nunca expone userId", async () => {
    rolActual = "owner";
    const http = await miembrosHttp(new Request(`https://site.test/api/members?project=${projectId}`));
    expect(http.status).toBe(200);
    const rows = (await http.json()) as Array<Record<string, unknown>>;
    expect(rows.every((row) => !("userId" in row))).toBe(true);
    const mcp = await llamar("listar_miembros", identidad.owner, { proyectoId: projectId });
    const miembros = (mcp.structuredContent as { miembros: Array<Record<string, unknown>> }).miembros;
    expect(miembros).toEqual(
      rows.map((row) => ({
        id: row.id,
        correo: row.email,
        rol: row.role,
        seccion: row.studentSection ?? null,
        profesorId: row.teacherId ?? null,
        estado: row.status,
      })),
    );
  });

  it("el profesorado solo ve alumnado y su propia ficha, igual por MCP y por la ruta", async () => {
    rolActual = "teacher";
    const http = await miembrosHttp(new Request(`https://site.test/api/members?project=${projectId}`));
    const rows = (await http.json()) as Array<Record<string, unknown>>;
    expect(rows.map((row) => row.email)).toEqual(["ada@example.com", "profe@example.com"]);
    const mcp = await llamar("listar_miembros", identidad.teacher, { proyectoId: projectId });
    const miembros = (mcp.structuredContent as { miembros: Array<Record<string, unknown>> }).miembros;
    expect(miembros.map((item) => item.correo)).toEqual(rows.map((row) => row.email));
  });

  it("el alumnado no lista miembros y recibe el mismo 403 por MCP y por la ruta", async () => {
    rolActual = "student";
    const http = await miembrosHttp(new Request(`https://site.test/api/members?project=${projectId}`));
    expect(http.status).toBe(403);
    expect(((await http.json()) as { message: string }).message).toBe("No tienes permiso para gestionar miembros.");
    const mcp = await llamar("listar_miembros", identidad.student, { proyectoId: projectId });
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "No tienes permiso para gestionar miembros." });
  });

  it("invitar a una ficha existente da el mismo resultado por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await invitarMiembroHttp(mutacion(`https://site.test/api/members?project=${projectId}`, "POST", {
      email: "ada@example.com",
      role: "student",
      studentSection: "s1",
      teacherId: null,
    }));
    expect(http.status).toBe(200);
    const row = (await http.json()) as Record<string, unknown>;
    const mcp = await llamar("invitar_miembro", identidad.owner, { proyectoId: projectId, correo: "ada@example.com", rol: "student", seccion: "s1" });
    expect(mcp.isError).toBeUndefined();
    expect((mcp.structuredContent as { miembro: Record<string, unknown> }).miembro).toEqual({
      id: row.id,
      correo: row.email,
      rol: row.role,
      seccion: row.studentSection ?? null,
      profesorId: row.teacherId ?? null,
      estado: row.status,
    });
    expect((mcp.structuredContent as { creada: boolean }).creada).toBe(false);
  });

  it("una ficha incoherente con el rol falla igual por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await invitarMiembroHttp(mutacion(`https://site.test/api/members?project=${projectId}`, "POST", { email: "profe@example.com", role: "teacher" }));
    expect(http.status).toBe(400);
    expect(((await http.json()) as { message: string }).message).toBe("Selecciona una ficha válida para el rol.");
    const mcp = await llamar("invitar_miembro", identidad.owner, { proyectoId: projectId, correo: "profe@example.com", rol: "teacher" });
    expect(errorDe(mcp)).toEqual({ codigo: "invalid", estado: 400, mensaje: "Selecciona una ficha válida para el rol." });
  });

  it("una cuenta con otro rol devuelve el mismo 409 por MCP y por la ruta", async () => {
    rolActual = "owner";
    const http = await invitarMiembroHttp(mutacion(`https://site.test/api/members?project=${projectId}`, "POST", { email: "ada@example.com", role: "guest" }));
    expect(http.status).toBe(409);
    expect(((await http.json()) as { message: string }).message).toBe("Esa cuenta ya tiene otro rol en el proyecto.");
    const mcp = await llamar("invitar_miembro", identidad.owner, { proyectoId: projectId, correo: "ada@example.com", rol: "guest" });
    expect(errorDe(mcp)).toEqual({ codigo: "conflict", estado: 409, mensaje: "Esa cuenta ya tiene otro rol en el proyecto." });
  });

  it("retirar un miembro coincide por MCP y por la ruta tras el aviso", async () => {
    rolActual = "owner";
    const aviso = await llamar("retirar_miembro", identidad.owner, { proyectoId: projectId, miembroId: memberId });
    expect(aviso.isError).toBeUndefined();
    expect(aviso.structuredContent).toMatchObject({ necesitaConfirmacion: true, herramienta: "retirar_miembro", miembroId: memberId, correo: "ada@example.com", rol: "student" });
    const http = await retirarMiembroHttp(mutacion(`https://site.test/api/members?project=${projectId}`, "DELETE", { id: memberId }));
    expect(http.status).toBe(200);
    expect(await http.json()).toEqual({ id: memberId });
    const mcp = await llamar("retirar_miembro", identidad.owner, { proyectoId: projectId, miembroId: memberId, confirmar: true });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ retirado: memberId });
  });

  it("el alumnado no retira a otra cuenta, igual por MCP y por la ruta", async () => {
    rolActual = "student";
    miembrosActuales = [filasMiembros[1]];
    const http = await retirarMiembroHttp(mutacion(`https://site.test/api/members?project=${projectId}`, "DELETE", { id: otherMemberId }));
    expect(http.status).toBe(403);
    expect(((await http.json()) as { message: string }).message).toBe("No tienes permiso para retirar esta cuenta.");
    const mcp = await llamar("retirar_miembro", identidad.student, { proyectoId: projectId, miembroId: otherMemberId, confirmar: true });
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "No tienes permiso para retirar esta cuenta." });
    miembrosActuales = filasMiembros;
  });

  it("eliminar una ficha de alumnado coincide por MCP y por la ruta", async () => {
    rolActual = "owner";
    const aviso = await llamar("eliminar_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1", revision: 2 });
    expect(aviso.isError).toBeUndefined();
    expect(aviso.structuredContent).toMatchObject({ necesitaConfirmacion: true, herramienta: "eliminar_alumno", nombre: "Ada", revision: 2 });
    const malNombre = await llamar("eliminar_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1", revision: 2, confirmar: true, nombre: "Otra" });
    expect(errorDe(malNombre)).toEqual({ codigo: "invalid", estado: 400, mensaje: "Escribe el nombre exacto de la ficha para confirmar la baja." });

    const http = await eliminarAlumnoHttp(mutacion(`https://site.test/api/students?project=${projectId}`, "DELETE", { section: "s1", revision: 2 }));
    expect(http.status).toBe(200);
    expect(await http.json()).toEqual({ section: "s1" });
    const mcp = await llamar("eliminar_alumno", identidad.owner, { proyectoId: projectId, seccion: "s1", revision: 2, confirmar: true, nombre: "Ada" });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ eliminada: "s1", nombre: "Ada" });
  });

  it("el alumnado no elimina la ficha de otra persona, igual por MCP y por la ruta", async () => {
    rolActual = "student";
    const http = await eliminarAlumnoHttp(mutacion(`https://site.test/api/students?project=${projectId}`, "DELETE", { section: "s2", revision: 1 }));
    expect(http.status).toBe(403);
    expect(((await http.json()) as { message: string }).message).toBe("Solo puedes editar tu propia ficha.");
    const mcp = await llamar("eliminar_alumno", identidad.student, { proyectoId: projectId, seccion: "s2", revision: 1, confirmar: true, nombre: "Grace" });
    expect(errorDe(mcp)).toEqual({ codigo: "forbidden", estado: 403, mensaje: "Solo puedes editar tu propia ficha." });
  });

  it("eliminar una ficha de profesorado coincide por MCP y por la ruta", async () => {
    rolActual = "teacher";
    const http = await eliminarProfesorHttp(mutacion(`https://site.test/api/teachers?project=${projectId}`, "DELETE", { id: teacherId, revision: 3 }));
    expect(http.status).toBe(200);
    expect(await http.json()).toEqual({ id: teacherId });
    const mcp = await llamar("eliminar_profesor", identidad.teacher, { proyectoId: projectId, profesorId: teacherId, revision: 3, confirmar: true, nombre: "Profe" });
    expect(mcp.isError).toBeUndefined();
    expect(mcp.structuredContent).toEqual({ eliminado: teacherId, nombre: "Profe" });
  });
});
