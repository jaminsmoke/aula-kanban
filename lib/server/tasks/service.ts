import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";
import { purgeDeletedProfiles } from "../deleted-profiles";
import type { ProjectWithAccess } from "../project-access";
import { createTask, deleteTask, updateTask, type MutationResult } from "./mutations";
import { createTaskPermissions, taskAuthGuard, taskWriteDenial, unassigned, validateRefs } from "./permissions";
import { decorate, projectData, taskAtRevision } from "./queries";
import type { DecoratedTask, ProjectData, TaskRef, TaskUpdate, TaskWriteFields } from "./types";

/**
 * Operaciones de tareas del proyecto: listar, crear, editar y borrar.
 *
 * La ruta HTTP solo valida la forma del cuerpo y traduce el resultado; aquí
 * viven la autorización de rol, la comprobación de revisión, la validación de
 * responsables y la decoración de la respuesta.
 */

/**
 * Guarda las referencias activas de una tarea ya cargada.
 * @param data - Fichas y referencias del proyecto.
 * @param taskId - Tarea de la que se leen las referencias.
 * @returns Las referencias de alumnado y profesorado de la tarea.
 */
function taskRefs(data: ProjectData, taskId: string): TaskRef[] {
  return data.refs
    .filter((ref) => ref.taskId === taskId && (ref.kind === "student" || ref.kind === "teacher"))
    .map((ref) => ({ kind: ref.kind as TaskRef["kind"], profileId: ref.profileId }));
}

/**
 * Lista las tareas del proyecto, decoradas para la API.
 * @param projectId - Proyecto activo.
 * @returns Las tareas en orden de creación.
 */
export async function listProjectTasks(projectId: string): Promise<DecoratedTask[]> {
  const db = getDb();
  await purgeDeletedProfiles(projectId);
  const [rows, data] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt), asc(tasks.id)),
    projectData(projectId),
  ]);
  return rows.map((task) => decorate(task, data));
}

/**
 * Crea una tarea a partir de campos ya validados.
 * @param input - Proyecto, cuenta y campos de la tarea.
 * @returns La tarea creada y decorada, o el error de negocio.
 */
export async function createProjectTask(input: {
  project: ProjectWithAccess;
  user: { userId: string; displayName: string };
  fields: TaskWriteFields;
}): Promise<MutationResult<DecoratedTask>> {
  const denied = taskWriteDenial(input.project.access);
  if (denied) return { ok: false, ...denied };

  const data = await projectData(input.project.id);
  const permissions = createTaskPermissions(input.project.access);
  const refs = input.fields.assignees ?? [];
  if (!validateRefs(refs, data)) return { ok: false, status: 400, message: "Selecciona responsables válidos de este proyecto." };
  if (permissions.isStudent && (!permissions.onlySelfOrNone(refs) || (!refs.length && !unassigned(input.fields.assignee)))) {
    return { ok: false, status: 403, message: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." };
  }
  const member = data.members.find((item) => item.status === "active" && item.userId === input.user.userId);
  const result = await createTask({
    projectId: input.project.id,
    user: input.user,
    auth: taskAuthGuard(input.project.access.role, input.user.userId, input.project.id),
    value: input.fields,
    refs,
    memberId: member?.id ?? null,
  });
  if (!result.ok) return result;
  // Las referencias de la tarea nueva no estaban en la carga anterior.
  return { ok: true, value: decorate(result.value, await projectData(input.project.id)) };
}

/**
 * Edita una tarea o cambia solo su estado.
 * @param input - Proyecto, cuenta, referencia y cambios ya validados.
 * @returns La tarea actualizada y decorada, o el error de negocio.
 */
export async function updateProjectTask(input: {
  project: ProjectWithAccess;
  user: { userId: string };
  id: string;
  revision: number;
  changes: TaskUpdate;
}): Promise<MutationResult<DecoratedTask>> {
  const denied = taskWriteDenial(input.project.access);
  if (denied) return { ok: false, ...denied };

  const data = await projectData(input.project.id);
  const auth = taskAuthGuard(input.project.access.role, input.user.userId, input.project.id);
  const current = await taskAtRevision({ id: input.id, projectId: input.project.id, revision: input.revision, guard: auth.guard });
  if (!current) {
    return { ok: false, status: 409, message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." };
  }
  const result = await updateTask({
    projectId: input.project.id,
    auth,
    data,
    permissions: createTaskPermissions(input.project.access),
    id: input.id,
    revision: input.revision,
    current,
    currentRefs: taskRefs(data, input.id),
    changes: input.changes,
  });
  if (!result.ok) return result;
  return { ok: true, value: decorate(result.value.task, result.value.data) };
}

/**
 * Borra una tarea y su pizarra tras comprobar revisión y permisos.
 * @param input - Proyecto, cuenta, identificador y revisión.
 * @returns El identificador borrado o el error de negocio.
 */
export async function deleteProjectTask(input: {
  project: ProjectWithAccess;
  user: { userId: string };
  id: string;
  revision: number;
}): Promise<MutationResult<{ id: string }>> {
  const denied = taskWriteDenial(input.project.access);
  if (denied) return { ok: false, ...denied };

  const data = await projectData(input.project.id);
  const auth = taskAuthGuard(input.project.access.role, input.user.userId, input.project.id);
  const current = await taskAtRevision({ id: input.id, projectId: input.project.id, revision: input.revision, guard: auth.guard });
  if (!current) {
    return { ok: false, status: 409, message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." };
  }
  return deleteTask({
    projectId: input.project.id,
    auth,
    permissions: createTaskPermissions(input.project.access),
    id: input.id,
    revision: input.revision,
    currentRefs: taskRefs(data, input.id),
  });
}
