import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";
import { getChatGPTUser } from "../../../lib/server/auth";
import { priorities, statuses } from "../../../lib/domain/task";
import { validProject } from "../../../lib/server/project";
import { purgeDeletedProfiles } from "../../../lib/server/deleted-profiles";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";
import { createTaskPermissions, taskAuthGuard, unassigned, validateRefs } from "../../../lib/server/tasks/permissions";
import { createTask, deleteTask, updateTask } from "../../../lib/server/tasks/mutations";
import { decorate, projectData } from "../../../lib/server/tasks/queries";
import type { TaskRef, TaskUpdate } from "../../../lib/server/tasks/types";

export const dynamic = "force-dynamic";
const person = z.object({ kind: z.enum(["student", "teacher"]), profileId: z.string().min(1).max(80) });
const fields = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(2000), imageUrl: z.string().trim().max(2048).refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value) || /^\/api\/files\/[A-Za-z0-9-]+$/.test(value), "URL de imagen no válida").optional(), assignee: z.string().trim().max(5000), assignees: z.array(person).max(50).optional(), dueDate: z.union([z.literal(""), z.string().date()]), priority: z.enum(priorities), status: z.enum(statuses) });
const reference = z.object({ id: z.string().uuid(), revision: z.number().int().positive(), changes: z.unknown().optional() });
type Ref = TaskRef;

/**
 * Lista, crea, edita o elimina tareas del proyecto según el método.
 * Al listar purga primero las bajas caducadas de 30 días.
 * @param request - Petición con el proyecto en la URL y, si aplica, el cuerpo JSON.
 * @returns Respuesta JSON con las tareas decoradas o el error.
 */
async function handle(request: Request) {
  if (request.method !== "GET") {
    if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
    if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  }
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión para acceder al tablero." }, 401);
  const project = await validProject(request); if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  const db = getDb();
  if (request.method === "GET") {
    await purgeDeletedProfiles(project.id);
    const [list, data] = await Promise.all([db.select().from(tasks).where(eq(tasks.projectId, project.id)).orderBy(asc(tasks.createdAt), asc(tasks.id)), projectData(project.id)]);
    return json(list.map(task => decorate(task, data)));
  }
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  const body = await request.json().catch(() => null);
  const data = await projectData(project.id);
  const permissions = createTaskPermissions(project.access);
  const { isStudent, onlySelfOrNone } = permissions;
  const auth = taskAuthGuard(project.access.role, user.userId, project.id);

  if (request.method === "POST") {
    const parsed = fields.safeParse(body); if (!parsed.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    const value = parsed.data, refs = value.assignees ?? [];
    if (!validateRefs(refs, data)) return json({ message: "Selecciona responsables válidos de este proyecto." }, 400);
    if (isStudent && (!onlySelfOrNone(refs) || (!refs.length && !unassigned(value.assignee)))) return json({ message: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." }, 403);
    const member = data.members.find(item => item.status === "active" && item.userId === user.userId);
    const result = await createTask({ projectId: project.id, user, auth, value, refs, memberId: member?.id ?? null });
    if (!result.ok) return json({ message: result.message }, result.status);
    return json(decorate(result.value, await projectData(project.id)), 201);
  }
  const parsed = reference.safeParse(body); if (!parsed.success) return json({ message: "La referencia de la tarea no es válida." }, 400);
  const { id, revision } = parsed.data;
  const matches = and(eq(tasks.id, id), eq(tasks.revision, revision), eq(tasks.projectId, project.id), auth.guard);
  const [current] = await db.select().from(tasks).where(matches);
  if (!current) return json({ message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." }, 409);
  const currentRefs: Ref[] = data.refs.filter(ref => ref.taskId === id && (ref.kind === "student" || ref.kind === "teacher")).map(ref => ({ kind: ref.kind as Ref["kind"], profileId: ref.profileId }));
  if (request.method === "DELETE") {
    const result = await deleteTask({ projectId: project.id, auth, permissions, id, revision, currentRefs });
    if (!result.ok) return json({ message: result.message }, result.status);
    return json(result.value);
  }
  const change = z.union([fields, fields.pick({ status: true }).strict()]).safeParse(parsed.data.changes);
  if (!change.success) return json({ message: "Revisa los campos de la tarea." }, 400);
  const result = await updateTask({
    projectId: project.id,
    auth,
    data,
    permissions,
    id,
    revision,
    current,
    currentRefs,
    changes: change.data as TaskUpdate,
  });
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(decorate(result.value.task, result.value.data));
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
