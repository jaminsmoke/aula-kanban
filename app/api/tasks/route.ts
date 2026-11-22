import { z } from "zod";
import { priorities, statuses } from "../../../lib/domain/task";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";
import { taskWriteDenial } from "../../../lib/server/tasks/permissions";
import { createProjectTask, deleteProjectTask, listProjectTasks, updateProjectTask } from "../../../lib/server/tasks/service";
import type { TaskUpdate } from "../../../lib/server/tasks/types";

export const dynamic = "force-dynamic";
const person = z.object({ kind: z.enum(["student", "teacher"]), profileId: z.string().min(1).max(80) });
const fields = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(2000), imageUrl: z.string().trim().max(2048).refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value) || /^\/api\/files\/[A-Za-z0-9-]+$/.test(value), "URL de imagen no válida").optional(), documentId: z.string().trim().min(1).max(80).nullable().optional(), assignee: z.string().trim().max(5000), assignees: z.array(person).max(50).optional(), dueDate: z.union([z.literal(""), z.string().date()]), priority: z.enum(priorities), status: z.enum(statuses) });
const reference = z.object({ id: z.string().uuid(), revision: z.number().int().positive(), changes: z.unknown().optional() });

/** Lista las tareas del proyecto con sus responsables y su creador. */
const listTasks = withProjectRoute(async (_request, project) => json(await listProjectTasks(project.id)));

/** Crea, edita, cambia el estado o borra una tarea validada. */
const mutateTasks = withJsonMutation(withProjectRoute(async (request, project) => {
  const denied = taskWriteDenial(project.access);
  if (denied) return json({ message: denied.message }, denied.status);
  const body = await request.json().catch(() => null);
  const user = project.access.user;

  if (request.method === "POST") {
    const parsed = fields.safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    const result = await createProjectTask({ project, user, fields: parsed.data });
    return result.ok ? json(result.value, 201) : json({ message: result.message }, result.status);
  }

  const parsed = reference.safeParse(body);
  if (!parsed.success) return json({ message: "La referencia de la tarea no es válida." }, 400);
  const { id, revision } = parsed.data;

  if (request.method === "DELETE") {
    const result = await deleteProjectTask({ project, user, id, revision });
    return result.ok ? json(result.value) : json({ message: result.message }, result.status);
  }

  const change = z.union([fields, fields.pick({ status: true }).strict()]).safeParse(parsed.data.changes);
  if (!change.success) return json({ message: "Revisa los campos de la tarea." }, 400);
  const result = await updateProjectTask({ project, user, id, revision, changes: change.data as TaskUpdate });
  return result.ok ? json(result.value) : json({ message: result.message }, result.status);
}));

export { listTasks as GET, mutateTasks as POST, mutateTasks as PATCH, mutateTasks as DELETE };
