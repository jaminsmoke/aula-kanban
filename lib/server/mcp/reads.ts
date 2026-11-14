import { asc, eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../../db";
import { projects, students, tasks as taskRows, teachers } from "../../../db/schema";
import type { ChatGPTUser } from "../auth";
import { findProject, projectAccessForUser, type Access, type ProjectRow } from "../project";
import { decorate, projectData } from "../tasks/queries";
import type { DecoratedTask, ProjectData } from "../tasks/types";
import { MCP_TOOLS } from "./tools";
import { calendarUrl, projectUrl } from "./links";

/**
 * Herramientas de lectura del MCP (Fase 2).
 *
 * Reutilizan exactamente las mismas fuentes que la API HTTP (`projectData`,
 * `decorate`, `projectAccessForUser`), así que un alumno o un invitado por MCP
 * ve lo mismo que en el tablero. Las de escritura siguen siendo esqueleto
 * hasta la Fase 3.
 */

/** Cuenta identificada por el token, sin depender de las cabeceras de ChatGPT. */
export type McpCaller = { userId: string; email: string };

const READ_TOOL_NAMES = new Set(["listar_proyectos", "listar_tareas", "obtener_tarea", "listar_alumnos", "listar_profesores"]);

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/**
 * Construye la cuenta de ChatGPT equivalente para las reglas de permisos.
 * @param caller - Cuenta del token MCP.
 * @returns La cuenta con el nombre visible del correo.
 */
export function toChatGPTUser(caller: McpCaller): ChatGPTUser {
  return { userId: caller.userId, email: caller.email, displayName: caller.email, fullName: null };
}

type Extra = { authInfo?: { extra?: { userId?: string; email?: string } } };

/**
 * Extrae la cuenta del token de la llamada MCP actual.
 * @param extra - Información extra que pasa el SDK en cada llamada.
 * @returns La cuenta o `null` si falta la identidad.
 */
export function callerFromExtra(extra: Extra): McpCaller | null {
  const userId = extra.authInfo?.extra?.userId;
  const email = extra.authInfo?.extra?.email;
  return userId ? { userId, email: email ?? "" } : null;
}

/**
 * Resultado de herramienta con la carga en JSON dentro de un texto.
 * @param payload - Datos de la respuesta.
 * @returns El resultado para el cliente MCP.
 */
export function payloadResult(payload: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/**
 * Error de herramienta con el mismo mensaje que la API HTTP.
 * @param message - Mensaje del contrato HTTP equivalente.
 * @returns El resultado de herramienta con `isError`.
 */
export function toolError(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

type Resolved = { ok: true; project: ProjectRow; access: Access } | { ok: false; error: string };

/**
 * Resuelve un proyecto y el acceso de la cuenta, como `resolveProject`.
 * @param user - Cuenta de ChatGPT equivalente del token.
 * @param projectId - Identificador del proyecto.
 * @returns El proyecto con acceso o el error del contrato HTTP.
 */
export async function resolve(user: ChatGPTUser, projectId: string): Promise<Resolved> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, error: "No se encuentra el proyecto." };
  const access = await projectAccessForUser(projectId, user);
  if (!access) return { ok: false, error: "No tienes acceso a este proyecto." };
  return { ok: true, project, access };
}

/**
 * Proyectos visibles para la cuenta, con su rol y su enlace.
 * @param user - Cuenta de ChatGPT equivalente del token.
 * @returns Los proyectos accesibles con su rol y enlaces.
 */
async function listProjects(user: ChatGPTUser) {
  const rows = await getDb().select().from(projects);
  const visible: Array<{ project: ProjectRow; access: Access }> = [];
  for (const project of rows) {
    const access = await projectAccessForUser(project.id, user);
    if (access) visible.push({ project, access });
  }
  return visible.map(({ project, access }) => ({
    id: project.id,
    nombre: project.name,
    rol: access.role,
    enlace: projectUrl(project.id),
    calendario: calendarUrl(project.id),
  }));
}

/**
 * Tareas decoradas de un proyecto, tal como las devuelve la API.
 * @param projectId - Identificador del proyecto.
 * @returns Los datos del proyecto y sus tareas decoradas.
 */
async function decoratedTasks(projectId: string): Promise<{ data: ProjectData; tasks: DecoratedTask[] }> {
  const db = getDb();
  const [data, rows] = await Promise.all([
    projectData(projectId),
    db.select().from(taskRows).where(eq(taskRows.projectId, projectId)).orderBy(asc(taskRows.createdAt)),
  ]);
  return { data, tasks: rows.map((row) => decorate(row, data)) };
}

/**
 * Filtros opcionales de `listar_tareas`, iguales a los de la vista del tablero.
 * @param tasks - Tareas decoradas de uno o varios proyectos.
 * @param args - Filtros recibidos de la herramienta.
 * @returns Las tareas que cumplen los filtros dados.
 */
function applyFilters(tasks: DecoratedTask[], args: { estado?: string; prioridad?: string; alumno?: string; texto?: string }) {
  const query = (args.texto ?? "").trim().toLocaleLowerCase("es");
  return tasks.filter((task) => {
    if (args.estado && task.status !== args.estado) return false;
    if (args.prioridad && task.priority !== args.prioridad) return false;
    if (args.alumno && !task.assignees.some((item) => item.kind === "student" && item.profileId === args.alumno)) return false;
    if (query) {
      const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

type TaskFilterArgs = {
  proyectoId?: string;
  estado?: string;
  prioridad?: string;
  alumno?: string;
  texto?: string;
  pagina?: number;
  porPagina?: number;
};

async function handleListProjects(user: ChatGPTUser): Promise<ToolResult> {
  return payloadResult({ proyectos: await listProjects(user) });
}

async function handleListTasks(user: ChatGPTUser, args: TaskFilterArgs): Promise<ToolResult> {
  const byProject: Array<{ projectId: string; tasks: DecoratedTask[] }> = [];
  if (args.proyectoId) {
    const resolved = await resolve(user, args.proyectoId);
    if (!resolved.ok) return toolError(resolved.error);
    byProject.push({ projectId: args.proyectoId, tasks: (await decoratedTasks(args.proyectoId)).tasks });
  } else {
    for (const { id } of await listProjects(user)) {
      byProject.push({ projectId: id, tasks: (await decoratedTasks(id)).tasks });
    }
  }
  const filtered = byProject.flatMap(({ projectId, tasks }) =>
    applyFilters(tasks, args).map((task) => ({ task, projectId })),
  );
  const per = args.porPagina ?? 50;
  const page = args.pagina ?? 1;
  const slice = filtered.slice((page - 1) * per, page * per);
  return payloadResult({
    tareas: slice.map(({ task, projectId }) => ({ ...task, proyectoId: projectId, enlace: projectUrl(projectId) })),
    total: filtered.length,
    pagina: page,
    porPagina: per,
  });
}

async function handleGetTask(user: ChatGPTUser, args: { proyectoId: string; tareaId: string }): Promise<ToolResult> {
  const resolved = await resolve(user, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const { tasks } = await decoratedTasks(args.proyectoId);
  const task = tasks.find((item) => item.id === args.tareaId);
  if (!task) return toolError("No se encuentra la tarea.");
  return payloadResult({ tarea: { ...task, proyectoId: args.proyectoId, enlace: projectUrl(args.proyectoId), calendario: calendarUrl(args.proyectoId) } });
}

async function handleListStudents(user: ChatGPTUser, args: { proyectoId: string }): Promise<ToolResult> {
  const resolved = await resolve(user, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const rows = await getDb().select().from(students).where(eq(students.projectId, args.proyectoId));
  return payloadResult({
    alumnos: rows
      .filter((row) => row.deleted === 0)
      .map((row) => ({ seccion: row.section, nombre: row.displayName || row.name, actividad: row.activities })),
  });
}

async function handleListTeachers(user: ChatGPTUser, args: { proyectoId: string }): Promise<ToolResult> {
  const resolved = await resolve(user, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const rows = await getDb().select().from(teachers).where(eq(teachers.projectId, args.proyectoId));
  return payloadResult({
    profesores: rows.map((row) => ({ id: row.id, nombre: row.displayName || row.name })),
  });
}

/**
 * Registra las herramientas de lectura del contrato.
 * @param server - Servidor MCP en el que registrarlas.
 */
export function registerReadTools(server: McpServer) {
  const needCaller = "Se necesita una cuenta válida del token.";
  const handlers: Record<string, (args: Record<string, unknown>, extra: Extra) => Promise<ToolResult>> = {
    listar_proyectos: async (_args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleListProjects(toChatGPTUser(who)) : toolError(needCaller);
    },
    listar_tareas: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleListTasks(toChatGPTUser(who), args as TaskFilterArgs) : toolError(needCaller);
    },
    obtener_tarea: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleGetTask(toChatGPTUser(who), args as { proyectoId: string; tareaId: string }) : toolError(needCaller);
    },
    listar_alumnos: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleListStudents(toChatGPTUser(who), args as { proyectoId: string }) : toolError(needCaller);
    },
    listar_profesores: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleListTeachers(toChatGPTUser(who), args as { proyectoId: string }) : toolError(needCaller);
    },
  };
  for (const tool of MCP_TOOLS.filter((item) => READ_TOOL_NAMES.has(item.name))) {
    const handler = handlers[tool.name];
    if (handler) server.tool(tool.name, tool.description, tool.inputSchema, async (args, extra) => handler(args as Record<string, unknown>, extra));
  }
}
