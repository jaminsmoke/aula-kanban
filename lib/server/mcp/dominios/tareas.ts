import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { tasks as taskRows } from "../../../../db/schema";
import { priorities, statuses } from "../../../../lib/domain/task";
import { createTask, deleteTask, updateTask } from "../../tasks/mutations";
import { createTaskPermissions, taskAuthGuard, unassigned, validateRefs } from "../../tasks/permissions";
import { decorate, projectData } from "../../tasks/queries";
import type { ProjectData, TaskRef, TaskRow, TaskWriteFields } from "../../tasks/types";
import type { Access } from "../../project-access";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, CODIGO_ESTADO, type McpCaller } from "../contexto";
import { calendarUrl, projectUrl } from "../enlaces";
import { listVisibleProjects } from "../../projects";
import { paginaDe, paginaDesde, type McpToolDefinicion } from "./tipos";

/**
 * Dominio de tareas: las 5 herramientas de la v1, con el mismo camino que la
 * API HTTP (`createTask`, `updateTask`, `deleteTask` y sus permisos). Un
 * alumno solo edita sus tareas o se asigna una sin responsable; una cuenta
 * invitada solo puede consultar.
 */

const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
const taskId = z.string().uuid().describe("Id de la tarea");
const person = z.object({
  kind: z.enum(["student", "teacher"]).describe("Tipo de perfil responsable"),
  profileId: z.string().min(1).max(80).describe("Id del perfil (sección de alumno o de profesor)"),
});
const revision = z.number().int().positive().optional().describe("Revisión conocida de la tarea; si se omite se usa la actual");
/** La misma validación que `/api/tasks`: URL http(s) o archivo del proyecto. */
const imagenUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value) || /^\/api\/files\/[A-Za-z0-9-]+$/.test(value), "URL de imagen no válida")
  .optional();

const GUEST_ERROR = "Las cuentas invitadas solo pueden consultar el proyecto.";

/** Herramienta y proyecto con el acceso de la cuenta ya comprobado. */
type EditorContext = { access: Access; data: ProjectData };

/**
 * Tareas decoradas de un proyecto, tal como las devuelve la API.
 * @param projectId - Identificador del proyecto.
 * @returns Los datos del proyecto y sus tareas decoradas.
 */
async function decoratedTasks(projectId: string): Promise<{ data: ProjectData; tasks: Array<ReturnType<typeof decorate>> }> {
  const db = getDb();
  const [data, rows] = await Promise.all([
    projectData(projectId),
    db.select().from(taskRows).where(eq(taskRows.projectId, projectId)).orderBy(asc(taskRows.createdAt)),
  ]);
  return { data, tasks: rows.map((row) => decorate(row, data)) };
}

/**
 * Fecha de hoy en formato ISO para los filtros de vencimiento.
 * @returns Hoy como `YYYY-MM-DD`.
 */
function filtroVencidas(): { hoyIso: string } {
  const hoy = new Date();
  return { hoyIso: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}` };
}

/**
 * Filtros opcionales de `listar_tareas`, iguales a los de la vista del tablero.
 * @param tasks - Tareas decoradas de uno o varios proyectos.
 * @param args - Filtros recibidos de la herramienta.
 * @returns Las tareas que cumplen los filtros dados.
 */
function applyFilters(
  tasks: Array<ReturnType<typeof decorate>>,
  args: {
    estado?: string;
    prioridad?: string;
    alumno?: string;
    profesor?: string;
    texto?: string;
    vencimientoDesde?: string;
    vencimientoHasta?: string;
    sinFecha?: boolean;
    vencidas?: boolean;
  },
) {
  const query = (args.texto ?? "").trim().toLocaleLowerCase("es");
  const { hoyIso } = filtroVencidas();
  return tasks.filter((task) => {
    if (args.estado && task.status !== args.estado) return false;
    if (args.prioridad && task.priority !== args.prioridad) return false;
    if (args.alumno && !task.assignees.some((item) => item.kind === "student" && item.profileId === args.alumno)) return false;
    if (args.profesor && !task.assignees.some((item) => item.kind === "teacher" && item.profileId === args.profesor)) return false;
    if (args.vencimientoDesde && !(task.dueDate && task.dueDate >= args.vencimientoDesde)) return false;
    if (args.vencimientoHasta && !(task.dueDate && task.dueDate <= args.vencimientoHasta)) return false;
    if (args.sinFecha && task.dueDate) return false;
    if (args.vencidas && !(task.dueDate && task.dueDate < hoyIso && task.status !== "done")) return false;
    if (query) {
      const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Días de la semana que usa `vencidas`/`orden`: lunes a domingo en curso. */
const PRIORIDAD_ORDEN: Record<string, number> = { high: 0, normal: 1, low: 2 };

/**
 * Ordena las tareas filtradas según el `orden` pedido.
 * @param tasks - Tareas ya filtradas.
 * @param orden - `creacion` (por defecto), `vencimiento` o `prioridad`.
 * @returns Las tareas ordenadas (sin fecha al final en `vencimiento`).
 */
function applyOrder(tasks: Array<ReturnType<typeof decorate>>, orden?: string) {
  if (orden === "vencimiento") {
    return [...tasks].sort((a, b) => {
      const fechaA = a.dueDate || "9999-12-31";
      const fechaB = b.dueDate || "9999-12-31";
      if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  }
  if (orden === "prioridad") {
    return [...tasks].sort((a, b) => (PRIORIDAD_ORDEN[a.priority] - PRIORIDAD_ORDEN[b.priority]) || (a.createdAt - b.createdAt));
  }
  return tasks;
}

/**
 * Resuelve el proyecto y comprueba que la cuenta puede escribir en él.
 * @param caller - Cuenta identificada por el token.
 * @param projectId - Identificador del proyecto.
 * @returns El contexto de escritura o el error del contrato.
 */
async function editorContext(caller: McpCaller, projectId: string) {
  const resolved = await resolve(toChatGPTUser(caller), projectId);
  if (!resolved.ok) return { ok: false as const, error: falloResolucion(resolved) };
  if (resolved.access.role === "guest") return { ok: false as const, error: errorHerramienta("forbidden", GUEST_ERROR) };
  return { ok: true as const, context: { access: resolved.access, data: await projectData(projectId) } as EditorContext };
}

/**
 * Busca la tarea actual de cualquier rol con la guarda de autorización,
 * como hace la ruta HTTP antes de mutar.
 * @param caller - Cuenta identificada por el token.
 * @param access - Acceso de la cuenta al proyecto.
 * @param projectId - Identificador del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns La fila actual o `null` si no existe o no la ve la cuenta.
 */
async function findCurrentTask(caller: McpCaller, access: Access, projectId: string, taskId: string): Promise<TaskRow | null> {
  const db = getDb();
  const auth = taskAuthGuard(access.role, caller.userId, projectId);
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

/**
 * Traduce el fallo de una mutación al contrato MCP por su estado HTTP.
 * @param failure - Fallo con estado y mensaje de la mutación.
 * @param revisionActual - Revisión vigente de la tarea, si se conoce (para `conflict`).
 * @returns El resultado de error.
 */
function falloMutacion(failure: { status: number; message: string }, revisionActual?: number) {
  const codigo = (Object.entries(CODIGO_ESTADO).find(([, estado]) => estado === failure.status)?.[0] ?? "error") as Parameters<typeof errorHerramienta>[0];
  return errorHerramienta(codigo, failure.message, revisionActual !== undefined ? { revisionActual } : undefined);
}

type TaskFilterArgs = {
  proyectoId?: string;
  estado?: string;
  prioridad?: string;
  alumno?: string;
  profesor?: string;
  texto?: string;
  vencimientoDesde?: string;
  vencimientoHasta?: string;
  sinFecha?: boolean;
  vencidas?: boolean;
  orden?: string;
  pagina?: number;
  porPagina?: number;
};

async function listarTareas(caller: McpCaller, args: Record<string, unknown>) {
  const user = toChatGPTUser(caller);
  const a = args as TaskFilterArgs;
  const byProject: Array<{ projectId: string; tasks: Array<ReturnType<typeof decorate>> }> = [];
  if (a.proyectoId) {
    const resolved = await resolve(user, a.proyectoId);
    if (!resolved.ok) return falloResolucion(resolved);
    byProject.push({ projectId: a.proyectoId, tasks: (await decoratedTasks(a.proyectoId)).tasks });
  } else {
    for (const { project } of await listVisibleProjects(user)) {
      byProject.push({ projectId: project.id, tasks: (await decoratedTasks(project.id)).tasks });
    }
  }
  const filtered = byProject.flatMap(({ projectId, tasks }) =>
    applyOrder(applyFilters(tasks, a), a.orden).map((task) => ({ task, projectId })),
  );
  const { pagina, porPagina } = paginaDesde(args);
  const page = paginaDe(
    filtered.map(({ task, projectId }) => ({ ...task, proyectoId: projectId, enlace: projectUrl(caller.origen, projectId) })),
    pagina,
    porPagina,
  );
  return payloadResult({ tareas: page.items, total: page.total, pagina: page.pagina, porPagina: page.porPagina });
}

async function obtenerTarea(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, tareaId } = args as { proyectoId: string; tareaId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const { tasks } = await decoratedTasks(proyectoId);
  const task = tasks.find((item) => item.id === tareaId);
  if (!task) return errorHerramienta("not_found", "No se encuentra la tarea.");
  return payloadResult({ tarea: { ...task, proyectoId, enlace: projectUrl(caller.origen, proyectoId), calendario: calendarUrl(caller.origen, proyectoId) } });
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

async function crearTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as CreateArgs;
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const refs = a.responsables ?? [];
  if (!validateRefs(refs, data)) return errorHerramienta("invalid", "Selecciona responsables válidos de este proyecto.");
  const value: TaskWriteFields = {
    title: a.titulo,
    description: a.descripcion ?? "",
    assignee: a.responsable ?? "",
    dueDate: a.vencimiento ?? "",
    priority: a.prioridad as TaskWriteFields["priority"],
    status: a.estado as TaskWriteFields["status"],
    imageUrl: a.imagenUrl ?? "",
    assignees: refs,
  };
  const permissions = createTaskPermissions(access);
  if (permissions.isStudent && (!permissions.onlySelfOrNone(refs) || (!refs.length && !unassigned(value.assignee)))) {
    return errorHerramienta("forbidden", "Solo puedes asignarte la tarea a ti o dejarla sin asignar.");
  }
  const memberId = data.members.find((member) => member.status === "active" && member.userId === caller.userId)?.id ?? null;
  const created = await createTask({
    projectId: a.proyectoId,
    user: { userId: caller.userId, displayName: caller.email },
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    value,
    refs,
    memberId,
  });
  if (!created.ok) return falloMutacion(created);
  return payloadResult({ tarea: { ...decorate(created.value, data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
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

async function actualizarTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as UpdateArgs;
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const current = await findCurrentTask(caller, access, a.proyectoId, a.tareaId);
  if (!current) return errorHerramienta("not_found", "No se encuentra la tarea.");
  const revision = a.revision ?? current.revision;
  const refs = currentRefs(data, a.tareaId);
  const hasFields = [a.titulo, a.descripcion, a.imagenUrl, a.responsable, a.responsables, a.vencimiento, a.prioridad].some((field) => field !== undefined);
  if (!hasFields) {
    if (!a.estado) return errorHerramienta("invalid", "Revisa los campos de la tarea.");
    const result = await updateTask({
      projectId: a.proyectoId,
      auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
      data,
      permissions: createTaskPermissions(access),
      id: a.tareaId,
      revision,
      current,
      currentRefs: refs,
      changes: { status: a.estado as TaskWriteFields["status"] },
    });
    if (!result.ok) return falloMutacion(result, current.revision);
    return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
  }
  const nextRefs = a.responsables ?? refs;
  if (!validateRefs(nextRefs, data, refs)) return errorHerramienta("invalid", "Selecciona responsables válidos de este proyecto.");
  const changes = {
    title: a.titulo ?? current.title,
    description: a.descripcion ?? current.description,
    imageUrl: a.imagenUrl ?? current.imageUrl ?? "",
    assignee: a.responsable ?? current.assignee,
    dueDate: a.vencimiento ?? current.dueDate,
    priority: a.prioridad ?? current.priority,
    status: a.estado ?? current.status,
    assignees: nextRefs,
  } as unknown as TaskWriteFields;
  const result = await updateTask({
    projectId: a.proyectoId,
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    data,
    permissions: createTaskPermissions(access),
    id: a.tareaId,
    revision,
    current,
    currentRefs: refs,
    changes,
  });
  if (!result.ok) return falloMutacion(result, current.revision);
  return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
}

type MoveArgs = { proyectoId: string; tareaId: string; revision?: number; estado: string };

async function moverTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as MoveArgs;
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const current = await findCurrentTask(caller, access, a.proyectoId, a.tareaId);
  if (!current) return errorHerramienta("not_found", "No se encuentra la tarea.");
  const result = await updateTask({
    projectId: a.proyectoId,
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    data,
    permissions: createTaskPermissions(access),
    id: a.tareaId,
    revision: a.revision ?? current.revision,
    current,
    currentRefs: currentRefs(data, a.tareaId),
    changes: { status: a.estado as TaskWriteFields["status"] },
  });
  if (!result.ok) return falloMutacion(result, current.revision);
  return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
}

type AssignArgs = { proyectoId: string; tareaId: string; revision?: number; responsables: TaskRef[] };

/**
 * Asigna o desasigna responsables en bloque sobre la lista completa.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto, tarea, responsables y revisión opcional.
 * @param quitar - `true` para desasignar, `false` para asignar.
 * @returns La tarea con sus responsables actualizados.
 */
async function asignarCon(caller: McpCaller, args: Record<string, unknown>, quitar: boolean) {
  const a = args as AssignArgs;
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const current = await findCurrentTask(caller, access, a.proyectoId, a.tareaId);
  if (!current) return errorHerramienta("not_found", "No se encuentra la tarea.");
  const refs = currentRefs(data, a.tareaId);
  const nextRefs = quitar
    ? refs.filter((ref) => !a.responsables.some((item) => item.kind === ref.kind && item.profileId === ref.profileId))
    : [...refs, ...a.responsables.filter((ref) => !refs.some((item) => item.kind === ref.kind && item.profileId === ref.profileId))];
  if (!validateRefs(nextRefs, data, refs)) return errorHerramienta("invalid", "Selecciona responsables válidos de este proyecto.");
  const changes = {
    title: current.title,
    description: current.description,
    imageUrl: current.imageUrl ?? "",
    assignee: current.assignee,
    dueDate: current.dueDate,
    priority: current.priority,
    status: current.status,
    assignees: nextRefs,
  } as unknown as TaskWriteFields;
  const result = await updateTask({
    projectId: a.proyectoId,
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    data,
    permissions: createTaskPermissions(access),
    id: a.tareaId,
    revision: a.revision ?? current.revision,
    current,
    currentRefs: refs,
    changes,
  });
  if (!result.ok) return falloMutacion(result, current.revision);
  return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
}

async function asignarTarea(caller: McpCaller, args: Record<string, unknown>) {
  return asignarCon(caller, args, false);
}

async function desasignarTarea(caller: McpCaller, args: Record<string, unknown>) {
  return asignarCon(caller, args, true);
}

type RescheduleArgs = { proyectoId: string; tareaId: string; revision?: number; vencimiento: string };

async function reprogramarTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as RescheduleArgs;
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const current = await findCurrentTask(caller, access, a.proyectoId, a.tareaId);
  if (!current) return errorHerramienta("not_found", "No se encuentra la tarea.");
  const refs = currentRefs(data, a.tareaId);
  const changes = {
    title: current.title,
    description: current.description,
    imageUrl: current.imageUrl ?? "",
    assignee: current.assignee,
    dueDate: a.vencimiento,
    priority: current.priority,
    status: current.status,
    assignees: refs,
  } as unknown as TaskWriteFields;
  const result = await updateTask({
    projectId: a.proyectoId,
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    data,
    permissions: createTaskPermissions(access),
    id: a.tareaId,
    revision: a.revision ?? current.revision,
    current,
    currentRefs: refs,
    changes,
  });
  if (!result.ok) return falloMutacion(result, current.revision);
  return payloadResult({ tarea: { ...decorate(result.value.task, result.value.data), proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) } });
}

type CalendarArgs = { proyectoId: string; desde: string; hasta: string };

/** Días máximos del rango del calendario. */
const MAX_DIAS_CALENDARIO = 92;

async function listarCalendario(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as CalendarArgs;
  const resolved = await resolve(toChatGPTUser(caller), a.proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const desdeMs = Date.parse(a.desde);
  const hastaMs = Date.parse(a.hasta);
  if (Number.isNaN(desdeMs) || Number.isNaN(hastaMs) || hastaMs < desdeMs) {
    return errorHerramienta("invalid", "El rango del calendario no es válido.");
  }
  if ((hastaMs - desdeMs) / 86_400_000 > MAX_DIAS_CALENDARIO) {
    return errorHerramienta("invalid", `El rango del calendario no puede superar los ${MAX_DIAS_CALENDARIO} días.`);
  }
  const { tasks } = await decoratedTasks(a.proyectoId);
  const porDia = new Map<string, Array<ReturnType<typeof decorate>>>();
  for (const task of tasks.filter((item) => item.dueDate && item.dueDate >= a.desde && item.dueDate <= a.hasta)) {
    const grupo = porDia.get(task.dueDate) ?? [];
    grupo.push(task);
    porDia.set(task.dueDate, grupo);
  }
  const dias = [...porDia.entries()]
    .sort(([fechaA], [fechaB]) => (fechaA < fechaB ? -1 : 1))
    .map(([fecha, lista]) => ({
      fecha,
      tareas: lista.map((task) => ({ ...task, proyectoId: a.proyectoId, enlace: projectUrl(caller.origen, a.proyectoId) })),
    }));
  return payloadResult({
    proyectoId: a.proyectoId,
    desde: a.desde,
    hasta: a.hasta,
    dias,
    enlace: calendarUrl(caller.origen, a.proyectoId),
  });
}

async function eliminarTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as { proyectoId: string; tareaId: string; revision?: number; confirmar?: boolean };
  const resolved = await editorContext(caller, a.proyectoId);
  if (!resolved.ok) return resolved.error;
  const { access, data } = resolved.context;
  const current = await findCurrentTask(caller, access, a.proyectoId, a.tareaId);
  if (!current) return errorHerramienta("not_found", "No se encuentra la tarea.");
  if (a.confirmar !== true) {
    return payloadResult({
      necesitaConfirmacion: true,
      herramienta: "eliminar_tarea",
      proyectoId: a.proyectoId,
      tareaId: a.tareaId,
      titulo: current.title,
      revision: current.revision,
      mensaje: "Esta acción eliminará la tarea y no se puede deshacer. Llama de nuevo con confirmar: true para continuar.",
    });
  }
  const result = await deleteTask({
    projectId: a.proyectoId,
    auth: taskAuthGuard(access.role, caller.userId, a.proyectoId),
    permissions: createTaskPermissions(access),
    id: a.tareaId,
    revision: a.revision ?? current.revision,
    currentRefs: currentRefs(data, a.tareaId),
  });
  if (!result.ok) return falloMutacion(result, current.revision);
  return payloadResult({ eliminada: result.value.id });
}

/** Herramientas del dominio de tareas. */
export const herramientasTareas: McpToolDefinicion[] = [
  {
    name: "listar_tareas",
    title: "Listar tareas",
    description: "Lista las tareas de un proyecto con filtros opcionales. Sin `proyectoId` lista las tareas de todos los proyectos visibles.",
    inputSchema: {
      proyectoId: projectId.optional(),
      estado: z.enum(statuses).optional().describe("Estado de la tarea"),
      prioridad: z.enum(priorities).optional().describe("Prioridad de la tarea"),
      alumno: z.string().max(80).optional().describe("Filtra por sección de alumnado asignada"),
      profesor: z.string().max(80).optional().describe("Filtra por profesor asignado"),
      texto: z.string().max(120).optional().describe("Busca en título y descripción"),
      vencimientoDesde: z.string().date().optional().describe("Vence a partir de esta fecha (YYYY-MM-DD)"),
      vencimientoHasta: z.string().date().optional().describe("Vence hasta esta fecha (YYYY-MM-DD)"),
      sinFecha: z.boolean().optional().describe("Solo tareas sin fecha de vencimiento"),
      vencidas: z.boolean().optional().describe("Solo tareas vencidas y no completadas"),
      orden: z.enum(["creacion", "vencimiento", "prioridad"]).optional().describe("Orden del listado"),
      pagina: z.number().int().min(1).optional(),
      porPagina: z.number().int().min(1).max(100).optional(),
    },
    outputSchema: {
      tareas: z.array(z.record(z.unknown())),
      total: z.number(),
      pagina: z.number(),
      porPagina: z.number(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarTareas,
  },
  {
    name: "obtener_tarea",
    title: "Obtener tarea",
    description: "Devuelve una tarea con sus responsables, su estado y su revisión.",
    inputSchema: { proyectoId: projectId, tareaId: taskId },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: obtenerTarea,
  },
  {
    name: "crear_tarea",
    title: "Crear tarea",
    description: "Crea una tarea en el proyecto. Respeta los permisos de la cuenta: un alumno solo puede asignársela a sí mismo o dejarla sin asignar, y una cuenta invitada no puede crear.",
    inputSchema: {
      proyectoId: projectId,
      titulo: z.string().trim().min(1).max(120),
      descripcion: z.string().trim().max(2000).optional(),
      imagenUrl: imagenUrl.describe("URL de imagen http(s) o ruta `/api/files/<id>`"),
      responsable: z.string().trim().max(5000).optional().describe("Texto libre de responsable (mismo campo que la web)"),
      responsables: z.array(person).max(50).optional(),
      vencimiento: z.union([z.literal(""), z.string().date()]).optional().describe("Fecha de vencimiento (YYYY-MM-DD)"),
      prioridad: z.enum(priorities),
      estado: z.enum(statuses),
    },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    handler: crearTarea,
  },
  {
    name: "actualizar_tarea",
    title: "Actualizar tarea",
    description: "Actualiza los campos indicados de una tarea o solo su estado. Devuelve la revisión nueva para la siguiente operación.",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      titulo: z.string().trim().min(1).max(120).optional(),
      descripcion: z.string().trim().max(2000).optional(),
      imagenUrl: imagenUrl,
      responsable: z.string().trim().max(5000).optional(),
      responsables: z.array(person).max(50).optional(),
      vencimiento: z.union([z.literal(""), z.string().date()]).optional(),
      prioridad: z.enum(priorities).optional(),
      estado: z.enum(statuses).optional(),
    },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: actualizarTarea,
  },
  {
    name: "mover_tarea",
    title: "Mover tarea",
    description: "Cambia solo el estado de una tarea (el cambio de columna del tablero). Sin cambiar sus demás datos; con `revision` se protege del conflicto.",
    inputSchema: { proyectoId: projectId, tareaId: taskId, revision, estado: z.enum(statuses).describe("Nuevo estado de la tarea") },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: moverTarea,
  },
  {
    name: "asignar_tarea",
    title: "Asignar tarea",
    description: "Añade responsables a una tarea sin reenviar la lista completa. El alumnado solo puede asignarse a sí mismo.",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      responsables: z.array(person).max(50).describe("Responsables que se añaden"),
    },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: asignarTarea,
  },
  {
    name: "desasignar_tarea",
    title: "Desasignar tarea",
    description: "Quita responsables de una tarea sin reenviar la lista completa.",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      responsables: z.array(person).max(50).describe("Responsables que se quitan"),
    },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: desasignarTarea,
  },
  {
    name: "reprogramar_tarea",
    title: "Reprogramar tarea",
    description: "Cambia solo la fecha de vencimiento de una tarea (fecha YYYY-MM-DD o un valor vacío para quitarla).",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      vencimiento: z.union([z.literal(""), z.string().date()]).describe("Nueva fecha de vencimiento (YYYY-MM-DD) o un valor vacío para quitarla"),
    },
    outputSchema: { tarea: z.record(z.unknown()) },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: reprogramarTarea,
  },
  {
    name: "listar_calendario",
    title: "Calendario del proyecto",
    description: "Lista las tareas con fecha de vencimiento de un proyecto agrupadas por día en un rango (máximo 92 días), con el enlace del calendario.",
    inputSchema: {
      proyectoId: projectId,
      desde: z.string().date().describe("Inicio del rango (YYYY-MM-DD)"),
      hasta: z.string().date().describe("Fin del rango (YYYY-MM-DD, máximo 92 días desde `desde`)"),
    },
    outputSchema: {
      proyectoId: z.string(),
      desde: z.string(),
      hasta: z.string(),
      dias: z.array(z.record(z.unknown())),
      enlace: z.string(),
    },
    scope: "mcp:read",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    handler: listarCalendario,
  },
  {
    name: "eliminar_tarea",
    title: "Eliminar tarea",
    description: "Elimina una tarea del proyecto. Sin `confirmar: true` devuelve primero un aviso con lo que se borrará. No se puede deshacer.",
    inputSchema: {
      proyectoId: projectId,
      tareaId: taskId,
      revision,
      confirmar: z.boolean().optional().describe("Llama con true para eliminar tras ver el aviso"),
    },
    outputSchema: { eliminada: z.string().optional(), necesitaConfirmacion: z.boolean().optional(), herramienta: z.string().optional(), proyectoId: z.string().optional(), tareaId: z.string().optional(), titulo: z.string().optional(), revision: z.number().optional(), mensaje: z.string().optional() },
    scope: "mcp:write",
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    handler: eliminarTarea,
  },
];
