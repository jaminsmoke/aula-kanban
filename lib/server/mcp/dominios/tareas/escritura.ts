import { createTask, deleteTask, updateTask } from "../../../tasks/mutations";
import { createTaskPermissions, taskAuthGuard, unassigned, validateRefs } from "../../../tasks/permissions";
import { decorate } from "../../../tasks/queries";
import type { TaskRef, TaskWriteFields } from "../../../tasks/types";
import { errorHerramienta, payloadResult, type McpCaller } from "../../contexto";
import { projectUrl } from "../../enlaces";
import { currentRefs, editorContext, falloMutacion, findCurrentTask } from "./comun";

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

/**
 * Crea una tarea con los mismos permisos que la ruta HTTP.
 * @param caller - Cuenta identificada por el token.
 * @param args - Datos de la tarea que se crea.
 * @returns La tarea creada o el error del contrato.
 */
export async function crearTarea(caller: McpCaller, args: Record<string, unknown>) {
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

/**
 * Actualiza los campos indicados o solo el estado de una tarea.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y campos que se actualizan.
 * @returns La tarea actualizada o el error del contrato.
 */
export async function actualizarTarea(caller: McpCaller, args: Record<string, unknown>) {
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

/**
 * Cambia solo el estado de una tarea.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y estado nuevo.
 * @returns La tarea actualizada o el error del contrato.
 */
export async function moverTarea(caller: McpCaller, args: Record<string, unknown>) {
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
 * @param args - Tarea y responsables que se modifican.
 * @param quitar - `true` para desasignar, `false` para asignar.
 * @returns La tarea actualizada o el error del contrato.
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

/**
 * Añade responsables a una tarea.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y responsables que se añaden.
 * @returns La tarea actualizada o el error del contrato.
 */
export async function asignarTarea(caller: McpCaller, args: Record<string, unknown>) {
  return asignarCon(caller, args, false);
}

/**
 * Quita responsables de una tarea.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y responsables que se quitan.
 * @returns La tarea actualizada o el error del contrato.
 */
export async function desasignarTarea(caller: McpCaller, args: Record<string, unknown>) {
  return asignarCon(caller, args, true);
}

type RescheduleArgs = { proyectoId: string; tareaId: string; revision?: number; vencimiento: string };

/**
 * Cambia solo la fecha de vencimiento de una tarea.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y fecha nueva.
 * @returns La tarea actualizada o el error del contrato.
 */
export async function reprogramarTarea(caller: McpCaller, args: Record<string, unknown>) {
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

type DeleteArgs = { proyectoId: string; tareaId: string; revision?: number; confirmar?: boolean };

/**
 * Elimina una tarea tras el aviso de confirmación.
 * @param caller - Cuenta identificada por el token.
 * @param args - Tarea y confirmación explícita.
 * @returns El aviso de confirmación o el identificador eliminado.
 */
export async function eliminarTarea(caller: McpCaller, args: Record<string, unknown>) {
  const a = args as DeleteArgs;
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
