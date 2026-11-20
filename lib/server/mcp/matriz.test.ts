import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Estas pruebas simulan D1 y cubren permisos/paridad; la transición tiene su propia suite SQLite.
vi.mock("../apps/app-migration", () => ({ migrateLegacyAppInstall: async () => {}, migrateLegacyAppPreferences: async () => {} }));

/**
 * Matriz de roles por herramienta (MCP-12): cada una de las 8 herramientas
 * ante propietario, administrador, profesor, alumno, invitado, cuenta sin
 * acceso y proyecto inexistente. La tabla se recorre por registro en el
 * orden del catálogo; la capa de acceso se mockea en el borde (ya cubierta
 * por `project.test.ts` y `permissions.test.ts`) y el resto es el camino
 * real: registro → envoltorio → manejador.
 */

const projectId = "11111111-1111-4111-8111-111111111111";
const missingId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const memberId = "66666666-6666-4666-8666-666666666666";
const administratorRow = { id: "99999999-9999-4999-8999-999999999999", email: "admin@example.com", userId: "u-admin", displayName: "Admin", revision: 1, mutationToken: null, createdAt: 1 };
const tokenRow = { id: "88888888-8888-4888-8888-888888888888", user_id: "u-owner", email: "owner@example.com", label: "Claude", token_hash: "hash", salt: "salt", last_used_at: null, created_at: 1, revoked_at: null };
const projectRow = { id: projectId, name: "Proyecto uno", createdAt: 1 };
let proyectosMock = [projectRow];
const taskRow = {
  id: taskId,
  projectId,
  title: "Tarea matriz",
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

type Rol = "owner" | "admin" | "teacher" | "student" | "guest" | "sin_acceso";
let rolActual: Rol = "owner";
const identidad: Record<Rol, { userId: string; email: string }> = {
  owner: { userId: "u-owner", email: "owner@example.com" },
  admin: { userId: "u-admin", email: "admin@example.com" },
  teacher: { userId: "u-teacher", email: "teacher@example.com" },
  student: { userId: "u-student", email: "student@example.com" },
  guest: { userId: "u-guest", email: "guest@example.com" },
  sin_acceso: { userId: "u-out", email: "out@example.com" },
};

function accesoPara(user: { userId: string; email: string }, role: string) {
  return { user: { ...user, displayName: user.email, fullName: null }, role, studentSection: role === "student" ? "s1" : null, teacherId: role === "teacher" ? "t1" : null };
}

const data = {
  profiles: [{ section: "s1", name: "Ada", displayName: null, activities: "", deleted: 0 }],
  staff: [{ id: "t1", name: "Profe", displayName: null, deleted: 0 }],
  removedProfiles: [],
  removedStaff: [],
  refs: [],
  members: Object.values(identidad).map((u) => ({ id: `m-${u.userId}`, projectId, userId: u.userId, role: "student", status: "active" })),
  identities: [],
};

vi.mock("../../../db", () => ({
  getD1: () => ({
    prepare: (sql: string) => ({
      bind: () => ({
        all: async () => {
          if (sql.includes("FROM mcp_tokens")) return { results: [tokenRow] };
          if (sql.includes("FROM mcp_audit_log")) return { results: sql.includes("COUNT(*)") ? [{ total: 0 }] : [] };
          return { results: [] };
        },
        run: async () => ({ meta: { changes: sql.includes("UPDATE mcp_tokens") ? 1 : 0 } }),
        first: async () => null,
      }),
    }),
  }),
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
        if (table === projectsTable) return chain(proyectosMock);
        if (table === taskRowsTable) return chain([taskRow]);
        if (table === boardsTable) return chain([{ id: "board1", projectId, ownerType: "space", ownerId: projectId, snapshot: '{"elements":[]}', revision: 2, updatedAt: 1 }]);
        if (table === appDocumentsTable) return chain([{ projectId, appId: "blockly", state: '{"blocks":{"languageVersion":0,"blocks":[]}}', updatedAt: 5, updatedByUserId: "u-owner" }]);
        if (table === studentsTable) return chain([{ section: "s1", projectId, name: "Ada", displayName: "Ada", activities: "lectura", deleted: 0 }]);
        if (table === teachersTable) return chain([{ id: "t1", projectId, name: "Profe", displayName: "Profe" }]);
        if (table === projectMembersTable) return chain([
          { id: memberId, projectId, userId: "u-student", email: "student@example.com", role: "student", studentSection: "s1", teacherId: null, status: "active" },
          { id: "m-t1", projectId, userId: "u-teacher", email: "teacher@example.com", role: "teacher", studentSection: null, teacherId: "t1", status: "active" },
          { id: "m-t2", projectId, userId: "u-other", email: "otro@example.com", role: "teacher", studentSection: null, teacherId: "t2", status: "pending" },
        ]);
        if (table === instanceAppsTable) return chain([{ appId: "excalidraw", installed: 1, version: "1.0.0" }, { appId: "calculadora", installed: 1, version: "1.0.0" }, { appId: "tabla-periodica", installed: 1, version: "1.0.0" }, { appId: "aula-documentos", installed: 1, version: "1.0.0" }, { appId: "blockly", installed: 1, version: "1.0.0" }]);
        if (table === administratorsTable) return chain([administratorRow]);
        return chain([]);
      },
    }),
    delete: () => ({ where: () => ({ returning: () => Promise.resolve([{ id: memberId }]) }) }),
    batch: async () => [...Array.from({ length: 9 }, () => ({})), { meta: { changes: 1 } }],
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ section: "s1", id: "t1", projectId, name: "Ada", displayName: "Ada", role: "", activities: "", aiHelp: "", deleted: 0, revision: 1, mutationToken: null }]),
        onConflictDoUpdate: () => ({ returning: () => Promise.resolve([{ updatedAt: 6 }]) }),
        onConflictDoNothing: () => ({ returning: () => Promise.resolve([{ id: "t1", projectId, name: "Ada", createdAt: 1 }]) }),
      }),
    }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([{ projectId, ownerType: "space", ownerId: projectId, snapshot: '{"elements":[]}', revision: 3, updatedAt: 1 }]) }) }) }),
  }),
}));

vi.mock("../projects/project-access", () => ({
  isOwner: async (user: { userId: string }) => user.userId === "u-owner",
  isAdministrator: async (user: { userId: string }) => user.userId === "u-admin",
  isOwnerContactEmail: async () => false,
  PROJECT_FAILURE_RESPONSES: {
    unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
    invalid: { status: 400, message: "Proyecto no válido." },
    not_found: { status: 404, message: "No se encuentra el proyecto." },
    forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
  },
  findProject: async (id: string) => (id === projectId ? projectRow : null),
  projectAccessForUser: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "owner") return accesoPara(user, "owner");
    if (rolActual === "admin") return accesoPara(user, "admin");
    if (rolActual === "teacher") return accesoPara(user, "teacher");
    if (rolActual === "student") return accesoPara(user, "student");
    if (rolActual === "guest") return accesoPara(user, "guest");
    return null;
  },
  globalRoleForUser: async (user: { userId: string }) => {
    if (user.userId === "u-owner") return "owner";
    if (user.userId === "u-admin") return "admin";
    return null;
  },
  memberAccess: async (id: string, user: { userId: string; email: string }) => {
    if (id !== projectId) return null;
    if (rolActual === "teacher") return accesoPara(user, "teacher");
    if (rolActual === "student") return accesoPara(user, "student");
    if (rolActual === "guest") return accesoPara(user, "guest");
    return null;
  },
}));

vi.mock("../tasks/queries", () => ({
  projectData: async () => data,
  decorate: (row: Record<string, unknown>) => ({ ...row }),
}));

vi.mock("../access/profile-update", () => ({ updateProfile: async () => ({ ok: true as const }) }));

vi.mock("cloudflare:workers", () => ({
  env: {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => {
            if (sql.includes("INSERT INTO administrators_unified")) return { results: [{ id: args[0] }] };
            if (sql.includes("UPDATE administrators_unified")) return { results: [{ id: args[4] }] };
            if (sql.includes("DELETE FROM administrators_unified")) return { results: [{ id: args[0] }] };
            return { results: [] };
          },
        }),
      }),
      batch: async () => [{ results: [{ section: "s1", id: "t1" }] }, { results: [] }, { results: [] }],
    },
  },
}));

vi.mock("../storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../storage")>();
  const upload = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", projectId: "11111111-1111-4111-8111-111111111111", storageKey: "p/task-image/a.png", url: "/api/files/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", mimeType: "image/png", sizeBytes: 4, purpose: "task-image", ownerUserId: "u-owner", createdAt: 1 };
  return { ...actual, storeUpload: async () => ({ id: upload.id, url: upload.url }) };
});
vi.mock("../storage/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../storage/repository")>();
  const upload = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", projectId: "11111111-1111-4111-8111-111111111111", storageKey: "p/task-image/a.png", url: "/api/files/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", mimeType: "image/png", sizeBytes: 4, purpose: "task-image", ownerUserId: "u-owner", createdAt: 1 };
  return { ...actual, findUpload: async () => upload };
});

vi.mock("../tasks/mutations", () => ({
  createTask: async () => ({ ok: true as const, value: { ...taskRow, revision: 1 } }),
  updateTask: async () => ({ ok: true as const, value: { task: { ...taskRow, status: "active", revision: 3 }, data } }),
  deleteTask: async () => ({ ok: true as const, value: { id: taskId } }),
}));

import { administrators as administratorsTable, appDocuments as appDocumentsTable, boards as boardsTable, instanceApps as instanceAppsTable, projectMembers as projectMembersTable, projects as projectsTable, students as studentsTable, tasks as taskRowsTable, teachers as teachersTable } from "../../../db/schema";
import { registerTools } from "./registro";

type Esperado = "ok" | "forbidden" | "not_found";

const args: Record<string, Record<string, unknown>> = {
  listar_proyectos: {},
  crear_proyecto: { nombre: "Proyecto matriz" },
  eliminar_proyecto: { proyectoId: projectId, confirmar: true, confirmarNombre: "Proyecto uno" },
  subir_archivo: { proyectoId: projectId, finalidad: "task-image", nombre: "nota.png", tipoMime: "image/png", contenidoBase64: "aG9sYQ==" },
  obtener_archivo: { proyectoId: projectId, archivoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  listar_tareas: { proyectoId: projectId },
  obtener_tarea: { proyectoId: projectId, tareaId: taskId },
  listar_alumnos: { proyectoId: projectId },
  listar_profesores: { proyectoId: projectId },
  obtener_alumno: { proyectoId: projectId, seccion: "s1" },
  obtener_profesor: { proyectoId: projectId, profesorId: "t1" },
  listar_miembros: { proyectoId: projectId },
  invitar_miembro: { proyectoId: projectId, correo: "nueva@example.com", rol: "student", seccion: "s1" },
  retirar_miembro: { proyectoId: projectId, miembroId: memberId, confirmar: true },
  crear_alumno: { proyectoId: projectId, nombre: "Ada Nueva" },
  crear_profesor: { proyectoId: projectId, nombre: "Profe Nuevo" },
  actualizar_alumno: { proyectoId: projectId, seccion: "s1", revision: 2, nombre: "Ada Lovelace" },
  actualizar_profesor: { proyectoId: projectId, profesorId: "t1", revision: 3, nombre: "Profe Nuevo" },
  eliminar_alumno: { proyectoId: projectId, seccion: "s1", revision: 2, confirmar: true, nombre: "Ada" },
  eliminar_profesor: { proyectoId: projectId, profesorId: "t1", revision: 3, confirmar: true, nombre: "Profe" },
  crear_tarea: { proyectoId: projectId, titulo: "Tarea matriz", prioridad: "normal", estado: "pending" },
  actualizar_tarea: { proyectoId: projectId, tareaId: taskId, estado: "active" },
  eliminar_tarea: { proyectoId: projectId, tareaId: taskId, confirmar: true },
  mover_tarea: { proyectoId: projectId, tareaId: taskId, estado: "active" },
  asignar_tarea: { proyectoId: projectId, tareaId: taskId, responsables: [{ kind: "student", profileId: "s1" }] },
  desasignar_tarea: { proyectoId: projectId, tareaId: taskId, responsables: [{ kind: "student", profileId: "s1" }] },
  reprogramar_tarea: { proyectoId: projectId, tareaId: taskId, vencimiento: "2026-11-20" },
  listar_calendario: { proyectoId: projectId, desde: "2026-11-01", hasta: "2026-11-30" },
  quien_soy: {},
  obtener_enlace: { proyectoId: projectId },
  abrir_app: { proyectoId: projectId, appId: "aula-documentos" },
  obtener_resumen_proyecto: { proyectoId: projectId },
  listar_invitaciones_pendientes: {},
  aceptar_invitacion: { id: "123e4567-e89b-42d3-a456-426614174001", ambito: "project" },
  listar_apps: {},
  obtener_app: { appId: "aula-documentos" },
  instalar_app: { appId: "aula-documentos" },
  desinstalar_app: { appId: "aula-documentos", confirmar: true },
  leer_pizarra: { proyectoId: projectId, tipo: "space", duenoId: projectId },
  guardar_pizarra: { proyectoId: projectId, tipo: "space", duenoId: projectId, snapshot: '{"elements":[]}', revision: 2 },
  anadir_a_pizarra: { proyectoId: projectId, tipo: "space", duenoId: projectId, revision: 2, elementos: [{ tipo: "rectangulo", x: 0, y: 0, ancho: 10, alto: 10 }] },
  consultar_elemento: { simbolo: "Na" },
  leer_programa_bloques: { proyectoId: projectId },
  guardar_programa_bloques: { proyectoId: projectId, estado: { blocks: { languageVersion: 0, blocks: [] } } },
  leer_diagrama: { proyectoId: projectId },
  guardar_diagrama: { proyectoId: projectId, documento: { code: "flowchart TD" } },
  listar_plantillas_diagrama: {},
  listar_ventanas: { proyectoId: projectId },
  cerrar_app: { proyectoId: projectId, appId: "aula-documentos" },
  minimizar_app: { proyectoId: projectId, appId: "aula-documentos" },
  restaurar_app: { proyectoId: projectId, appId: "aula-documentos" },
  ampliar_app: { proyectoId: projectId, appId: "aula-documentos" },
  listar_administradores: {},
  crear_administrador: { nombre: "Admin Nuevo", correo: "admin@example.com" },
  actualizar_administrador: { administradorId: administratorRow.id, revision: 1, nombre: "Admin Actualizado" },
  eliminar_administrador: { administradorId: administratorRow.id, revision: 1, confirmar: true, confirmarNombre: "Admin" },
  listar_tokens_mcp: {},
  revocar_token_mcp: { tokenId: tokenRow.id, confirmar: true },
  listar_actividad_mcp: { pagina: 1 },
};

/** Matriz esperada: herramienta → rol → resultado. */
const matriz: Record<string, Partial<Record<Rol | "inexistente", Esperado>>> = {
  listar_proyectos: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  crear_proyecto: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  eliminar_proyecto: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  subir_archivo: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  obtener_archivo: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_tareas: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  obtener_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_alumnos: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_profesores: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  obtener_alumno: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  obtener_profesor: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_miembros: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  invitar_miembro: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  retirar_miembro: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  crear_alumno: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  crear_profesor: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  actualizar_alumno: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  actualizar_profesor: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  eliminar_alumno: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  eliminar_profesor: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  crear_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  actualizar_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  eliminar_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  mover_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  asignar_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  desasignar_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  reprogramar_tarea: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_calendario: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  quien_soy: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  obtener_enlace: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  abrir_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  obtener_resumen_proyecto: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_invitaciones_pendientes: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  aceptar_invitacion: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  listar_apps: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  obtener_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  instalar_app: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  desinstalar_app: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  leer_pizarra: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  guardar_pizarra: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  anadir_a_pizarra: { owner: "ok", admin: "ok", teacher: "ok", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  consultar_elemento: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  leer_programa_bloques: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  guardar_programa_bloques: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  leer_diagrama: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  guardar_diagrama: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "forbidden", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_plantillas_diagrama: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  listar_ventanas: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  cerrar_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  minimizar_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  restaurar_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  ampliar_app: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "forbidden", inexistente: "not_found" },
  listar_administradores: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  crear_administrador: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  actualizar_administrador: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  eliminar_administrador: { owner: "ok", admin: "ok", teacher: "forbidden", student: "forbidden", guest: "forbidden", sin_acceso: "forbidden" },
  listar_tokens_mcp: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  revocar_token_mcp: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
  listar_actividad_mcp: { owner: "ok", admin: "ok", teacher: "ok", student: "ok", guest: "ok", sin_acceso: "ok" },
};

async function llamar(tool: string, user: { userId: string; email: string }, argumentsEstaticos: Record<string, unknown>) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerTools(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message, options) =>
    send(message, { ...options, authInfo: { token: "ak", clientId: "t1", scopes: [], extra: { userId: user.userId, email: user.email } } });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  try {
    return await client.callTool({ name: tool, arguments: argumentsEstaticos });
  } finally {
    await client.close();
    await server.close();
  }
}

describe("matriz de roles por herramienta", () => {
  it("listar_apps con proyectoId sin acceso → forbidden", async () => {
    rolActual = "sin_acceso";
    const result = await llamar("listar_apps", identidad.sin_acceso, { proyectoId: projectId });
    expect(result.isError).toBe(true);
    const error = (result.structuredContent as { error?: { codigo?: string } } | undefined)?.error;
    expect(error?.codigo).toBe("forbidden");
  });
  it("listar_apps con proyectoId inexistente → not_found", async () => {
    rolActual = "owner";
    const result = await llamar("listar_apps", identidad.owner, { proyectoId: missingId });
    expect(result.isError).toBe(true);
    const error = (result.structuredContent as { error?: { codigo?: string } } | undefined)?.error;
    expect(error?.codigo).toBe("not_found");
  });
  for (const [tool, casos] of Object.entries(matriz)) {
    for (const [caso, esperado] of Object.entries(casos)) {
      it(`${tool} · ${caso} → ${esperado}`, async () => {
        if (caso === "inexistente") {
          rolActual = "owner";
          proyectosMock = [];
          const result = await llamar(tool, identidad.owner, { ...args[tool], proyectoId: missingId });
          expect(result.isError).toBe(true);
          const error = (result.structuredContent as { error?: { codigo?: string } } | undefined)?.error;
          expect(error?.codigo).toBe("not_found");
          proyectosMock = [projectRow];
          return;
        }
        rolActual = caso as Rol;
        const result = await llamar(tool, identidad[caso as Rol], args[tool]);
        if (esperado === "ok") {
          expect(result.isError).toBeUndefined();
        } else {
          expect(result.isError).toBe(true);
          const error = (result.structuredContent as { error?: { codigo?: string } } | undefined)?.error;
          expect(error?.codigo).toBe("forbidden");
        }
      });
    }
  }
});
