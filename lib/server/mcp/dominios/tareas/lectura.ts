import { calendarUrl, projectUrl } from "../../enlaces";
import { listVisibleProjects } from "../../../projects/projects";
import { errorHerramienta, falloResolucion, payloadResult, resolve, toChatGPTUser, type McpCaller } from "../../contexto";
import { paginaDe, paginaDesde } from "../tipos";
import { decoratedTasks, type DecoratedTask } from "./comun";
import { applyFilters, applyOrder, type TaskFilterArgs } from "./filtros";

/**
 * Lista tareas de un proyecto o de todos los proyectos visibles.
 * @param caller - Cuenta identificada por el token.
 * @param args - Filtros y paginación de la herramienta.
 * @returns El listado paginado de tareas.
 */
export async function listarTareas(caller: McpCaller, args: Record<string, unknown>) {
  const user = toChatGPTUser(caller);
  const a = args as TaskFilterArgs;
  const byProject: Array<{ projectId: string; tasks: DecoratedTask[] }> = [];
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

/**
 * Devuelve una tarea con sus responsables, estado y revisión.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y tarea solicitados.
 * @returns La tarea y sus enlaces.
 */
export async function obtenerTarea(caller: McpCaller, args: Record<string, unknown>) {
  const { proyectoId, tareaId } = args as { proyectoId: string; tareaId: string };
  const resolved = await resolve(toChatGPTUser(caller), proyectoId);
  if (!resolved.ok) return falloResolucion(resolved);
  const { tasks } = await decoratedTasks(proyectoId);
  const task = tasks.find((item) => item.id === tareaId);
  if (!task) return errorHerramienta("not_found", "No se encuentra la tarea.");
  return payloadResult({ tarea: { ...task, proyectoId, enlace: projectUrl(caller.origen, proyectoId), calendario: calendarUrl(caller.origen, proyectoId) } });
}

type CalendarArgs = { proyectoId: string; desde: string; hasta: string };

/** Días máximos del rango del calendario. */
const MAX_DIAS_CALENDARIO = 92;

/**
 * Lista las tareas con fecha de vencimiento agrupadas por día.
 * @param caller - Cuenta identificada por el token.
 * @param args - Proyecto y rango de fechas.
 * @returns Los días con sus tareas y el enlace del calendario.
 */
export async function listarCalendario(caller: McpCaller, args: Record<string, unknown>) {
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
  const porDia = new Map<string, DecoratedTask[]>();
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
