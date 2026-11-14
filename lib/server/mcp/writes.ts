import { and, eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDb } from "../../../db";
import { tasks as taskRows } from "../../../db/schema";
import { createTask, deleteTask, updateTask } from "../tasks/mutations";
import { createTaskPermissions, taskAuthGuard, unassigned, validateRefs } from "../tasks/permissions";
import { decorate, projectData } from "../tasks/queries";
import type { ProjectData, TaskRef, TaskRow, TaskWriteFields } from "../tasks/types";
import type { Access } from "../project";
import { callerFromExtra, payloadResult, resolve, toolError, toChatGPTUser, type McpCaller } from "./reads";
import { projectUrl } from "./links";
import { MCP_TOOLS } from "./tools";

/**
 * Herramientas de escritura del MCP (Fase 3).
 *
 * Reutilizan el mismo camino que la API HTTP (`createTask`, `updateTask`,
 * `deleteTask` y sus reglas de permisos): un alumno solo edita sus tareas o
 * se asigna una sin responsable, y una cuenta invitada solo puede consultar.
 */

const WRITE_TOOL_NAMES = new Set(["crear_tarea", "actualizar_tarea", "eliminar_tarea"]);
const GUEST_ERROR = "Las cuentas invitadas solo pueden consultar el proyecto.";
type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };
type Extra = { authInfo?: { extra?: { userId?: string; email?: string } } };

/** Herramienta y proyecto con el acceso de la cuenta ya comprobado. */
type EditorContext = { access: Access; data: ProjectData };

/**
 * Resuelve el proyecto y comprueba que la cuenta puede escribir en él.
 * @param who - Cuenta identificada por el token.
 * @param projectId - Identificador del proyecto.
 * @returns El contexto de escritura o el error del contrato HTTP.
 */
async function editorContext(who: McpCaller, projectId: string): Promise<{ ok: true; context: EditorContext } | { ok: false; error: string }> {
  const resolved = await resolve(toChatGPTUser(who), projectId);
  if (!resolved.ok) return resolved;
  if (resolved.access.role === "guest") return { ok: false, error: GUEST_ERROR };
  return { ok: true, context: { access: resolved.access, data: await projectData(projectId) } };
}

/**
 * Busca la tarea actual de cualquier rol con la guarda de autorización,
 * como hace la ruta HTTP antes de mutar.
 * @param who - Cuenta identificada por el token.
 * @param access - Acceso de la cuenta al proyecto.
 * @param projectId - Identificador del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns La fila actual o `null` si no existe o no la ve la cuenta.
 */
async function findCurrentTask(who: McpCaller, access: Access, projectId: string, taskId: string): Promise<TaskRow | null> {
  const db = getDb();
  const auth = taskAuthGuard(access.role, who.userId, projectId);
  const [current] = await db.select().from(taskRows).where(and(eq(taskRows.id, taskId), eq(taskRows.projectId, projectId), auth.guard));
  return current ?? null;
}

/**
 * Referencias actuales de una tarea, tal como las agrupa la ruta HTTP.
 * @param data - Datos del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns Referencias vigentes de la tarea.
 */
function currentRefs(data: ProjectData, taskId: string): TaskRef[] {
  return data.refs
    .filter((ref) => ref.taskId === taskId && (ref.kind === "student" || ref.kind === "teacher"))
    .map((ref) => ({ kind: ref.kind as TaskRef["kind"], profileId: ref.profileId }));
}

type CreateArgs = {
  proyectoId: string;
  titulo: string;
  descripcion?: string;
  imagenUrl?: string;
  responsable?: string;
  responsables?: TaskRef[];
  vencimiento?: string;
  prioridad: string;
  estado: string;
};

async function handleCreateTask(who: McpCaller, args: CreateArgs): Promise<ToolResult> {
  const resolved = await editorContext(who, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const { access, data } = resolved.context;
  const refs = args.responsables ?? [];
  if (!validateRefs(refs, data)) return toolError("Selecciona responsables válidos de este proyecto.");
  const value: TaskWriteFields = {
    title: args.titulo,
    description: args.descripcion ?? "",
    assignee: args.responsable ?? "",
    dueDate: args.vencimiento ?? "",
    priority: args.prioridad as TaskWriteFields["priority"],
    status: args.estado as TaskWriteFields["status"],
    imageUrl: args.imagenUrl ?? "",
    assignees: refs,
  };
  const permissions = createTaskPermissions(access);
  if (permissions.isStudent && (!permissions.onlySelfOrNone(refs) || (!refs.length && !unassigned(value.assignee)))) {
    return toolError("Solo puedes asignarte la tarea a ti o dejarla sin asignar.");
  }
  const memberId = data.members.find((member) => member.status === "active" && member.userId === who.userId)?.id ?? null;
  const created = await createTask({
    projectId: args.proyectoId,
    user: { userId: who.userId, displayName: who.email },
    auth: taskAuthGuard(access.role, who.userId, args.proyectoId),
    value,
    refs,
    memberId,
  });
  if (!created.ok) return toolError(created.message);
  return payloadResult({ tarea: { ...decorate(created.value, data), proyectoId: args.proyectoId, enlace: projectUrl(args.proyectoId) } });
}

type UpdateArgs = {
  proyectoId: string;
  tareaId: string;
  revision?: number;
  titulo?: string;
  descripcion?: string;
  imagenUrl?: string;
  responsable?: string;
  responsables?: TaskRef[];
  vencimiento?: string;
  prioridad?: string;
  estado?: string;
};

async function handleUpdateTask(who: McpCaller, args: UpdateArgs): Promise<ToolResult> {
  const resolved = await editorContext(who, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const { access, data } = resolved.context;
  const current = await findCurrentTask(who, access, args.proyectoId, args.tareaId);
  if (!current) return toolError("No se encuentra la tarea.");
  const revision = args.revision ?? current.revision;
  const refs = currentRefs(data, args.tareaId);
  const hasFields = [args.titulo, args.descripcion, args.imagenUrl, args.responsable, args.responsables, args.vencimiento, args.prioridad].some((field) => field !== undefined);
  if (!hasFields) {
    if (!args.estado) return toolError("Revisa los campos de la tarea.");
    const result = await updateTask({
      projectId: args.proyectoId,
      auth: taskAuthGuard(access.role, who.userId, args.proyectoId),
      data,
      permissions: createTaskPermissions(access),
      id: args.tareaId,
      revision,
      current,
      currentRefs: refs,
      changes: { status: args.estado as TaskWriteFields["status"] },
    });
    if (!result.ok) return toolError(result.message);
    return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: args.proyectoId, enlace: projectUrl(args.proyectoId) } });
  }
  const nextRefs = args.responsables ?? refs;
  if (!validateRefs(nextRefs, data, refs)) return toolError("Selecciona responsables válidos de este proyecto.");
  const changes = {
    title: args.titulo ?? current.title,
    description: args.descripcion ?? current.description,
    imageUrl: args.imagenUrl ?? current.imageUrl ?? "",
    assignee: args.responsable ?? current.assignee,
    dueDate: args.vencimiento ?? current.dueDate,
    priority: args.prioridad ?? current.priority,
    status: args.estado ?? current.status,
    assignees: nextRefs,
  } as unknown as TaskWriteFields;
  const result = await updateTask({
    projectId: args.proyectoId,
    auth: taskAuthGuard(access.role, who.userId, args.proyectoId),
    data,
    permissions: createTaskPermissions(access),
    id: args.tareaId,
    revision,
    current,
    currentRefs: refs,
    changes,
  });
  if (!result.ok) return toolError(result.message);
  return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: args.proyectoId, enlace: projectUrl(args.proyectoId) } });
}

async function handleDeleteTask(who: McpCaller, args: { proyectoId: string; tareaId: string; revision?: number }): Promise<ToolResult> {
  const resolved = await editorContext(who, args.proyectoId);
  if (!resolved.ok) return toolError(resolved.error);
  const { access, data } = resolved.context;
  const current = await findCurrentTask(who, access, args.proyectoId, args.tareaId);
  if (!current) return toolError("No se encuentra la tarea.");
  const result = await deleteTask({
    projectId: args.proyectoId,
    auth: taskAuthGuard(access.role, who.userId, args.proyectoId),
    permissions: createTaskPermissions(access),
    id: args.tareaId,
    revision: args.revision ?? current.revision,
    currentRefs: currentRefs(data, args.tareaId),
  });
  if (!result.ok) return toolError(result.message);
  return payloadResult({ eliminada: result.value.id });
}

/**
 * Registra las herramientas de escritura del contrato.
 * @param server - Servidor MCP en el que registrarlas.
 */
export function registerWriteTools(server: McpServer) {
  const needCaller = "Se necesita una cuenta válida del token.";
  const handlers: Record<string, (args: Record<string, unknown>, extra: Extra) => Promise<ToolResult>> = {
    crear_tarea: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleCreateTask(who, args as CreateArgs) : toolError(needCaller);
    },
    actualizar_tarea: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleUpdateTask(who, args as UpdateArgs) : toolError(needCaller);
    },
    eliminar_tarea: async (args, extra) => {
      const who = callerFromExtra(extra);
      return who ? handleDeleteTask(who, args as { proyectoId: string; tareaId: string; revision?: number }) : toolError(needCaller);
    },
  };
  for (const tool of MCP_TOOLS.filter((item) => WRITE_TOOL_NAMES.has(item.name))) {
    const handler = handlers[tool.name];
    if (handler) server.tool(tool.name, tool.description, tool.inputSchema, async (args, extra) => handler(args as Record<string, unknown>, extra));
  }
}
