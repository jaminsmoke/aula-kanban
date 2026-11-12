import { env } from "cloudflare:workers";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, students, taskAssignees, tasks, teachers, userIdentities } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { priorities, statuses } from "../../task";
import { validProject } from "../project";
import { normalizeName } from "../../assignments";

export const dynamic = "force-dynamic";
const person = z.object({ kind: z.enum(["student", "teacher"]), profileId: z.string().min(1).max(80) });
const fields = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(2000), assignee: z.string().trim().max(5000), assignees: z.array(person).max(50).optional(), dueDate: z.union([z.literal(""), z.string().date()]), priority: z.enum(priorities), status: z.enum(statuses) });
const reference = z.object({ id: z.string().uuid(), revision: z.number().int().positive(), changes: z.unknown().optional() });
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
type Ref = z.infer<typeof person>;
const unassigned = (name: string) => !name.trim() || normalizeName(name) === "por definir";

async function projectData(projectId: string) {
  const db = getDb();
  const [profiles, staff, refs, members, identities] = await Promise.all([
    db.select().from(students).where(and(eq(students.projectId, projectId), eq(students.deleted, 0))),
    db.select().from(teachers).where(eq(teachers.projectId, projectId)),
    db.select().from(taskAssignees).where(eq(taskAssignees.projectId, projectId)),
    db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.select().from(userIdentities),
  ]);
  return { profiles, staff, refs, members, identities };
}
function decorate(task: typeof tasks.$inferSelect, data: Awaited<ReturnType<typeof projectData>>) {
  const assignments = data.refs.filter(ref => ref.taskId === task.id).flatMap(ref => {
    const profile = ref.kind === "student" ? data.profiles.find(p => p.section === ref.profileId) : ref.kind === "teacher" ? data.staff.find(p => p.id === ref.profileId) : undefined;
    return profile ? [{ kind: ref.kind, profileId: ref.profileId, name: "displayName" in profile ? profile.displayName : profile.name }] : [];
  });
  const creatorMember = data.members.find(member => member.id === task.creatorMemberId && member.userId === task.creatorUserId && member.status === "active");
  const creatorProfile = creatorMember?.studentSection ? data.profiles.find(p => p.section === creatorMember.studentSection)?.displayName : creatorMember?.teacherId ? data.staff.find(p => p.id === creatorMember.teacherId)?.name : undefined;
  const creator = creatorProfile || data.identities.find(identity => identity.id === task.creatorUserId)?.displayName || task.creatorName || null;
  return { id: task.id, title: task.title, description: task.description, assignee: assignments.length ? assignments.map(item => item.name).join(", ") : task.assignee, assignees: assignments, dueDate: task.dueDate, priority: task.priority, status: task.status, createdAt: task.createdAt, revision: task.revision, creator };
}
function validateRefs(refs: Ref[], data: Awaited<ReturnType<typeof projectData>>) {
  const unique = new Set(refs.map(ref => `${ref.kind}:${ref.profileId}`));
  return unique.size === refs.length && refs.every(ref => ref.kind === "student" ? data.profiles.some(p => p.section === ref.profileId) : data.staff.some(p => p.id === ref.profileId));
}
function sameRefs(a: Ref[], b: Ref[]) {
  return a.length === b.length && a.every(ref => b.some(other => ref.kind === other.kind && ref.profileId === other.profileId));
}
// Linked assignments live only in task_assignees. The text column is reserved for legacy or external labels.
function unlinkedAssigneeText(refs: Ref[], fallback: string) { return refs.length ? "" : fallback; }

async function handle(request: Request) {
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión para acceder al tablero." }, 401);
  const project = await validProject(request); if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  const db = getDb();
  if (request.method === "GET") {
    const [list, data] = await Promise.all([db.select().from(tasks).where(eq(tasks.projectId, project.id)).orderBy(asc(tasks.createdAt), asc(tasks.id)), projectData(project.id)]);
    return json(list.map(task => decorate(task, data)));
  }
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato de solicitud no válido." }, 415);
  const body = await request.json().catch(() => null);
  const data = await projectData(project.id);
  const selfId = project.access.studentSection;
  const own = (refs: Ref[]) => Boolean(selfId && refs.some(ref => ref.kind === "student" && ref.profileId === selfId));
  const isStudent = project.access.role === "student";
  const onlySelfOrNone = (refs: Ref[]) => refs.length === 0 || (refs.length === 1 && own(refs));
  const binding = env.DB; if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const authSql = project.access.role === "owner" ? "1 = 1" : project.access.role === "admin" ? "EXISTS (SELECT 1 FROM administrators WHERE user_id = ?)" : "EXISTS (SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND status = 'active' AND role = ?)";
  const authArgs = project.access.role === "owner" ? [] : project.access.role === "admin" ? [user.userId] : [project.id, user.userId, project.access.role];
  const authGuard = project.access.role === "owner" ? sql`1 = 1` : project.access.role === "admin" ? sql`EXISTS (SELECT 1 FROM administrators WHERE user_id = ${user.userId})` : sql`EXISTS (SELECT 1 FROM project_members WHERE project_id = ${project.id} AND user_id = ${user.userId} AND status = 'active' AND role = ${project.access.role})`;

  if (request.method === "POST") {
    const parsed = fields.safeParse(body); if (!parsed.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    const value = parsed.data, refs = value.assignees ?? [];
    if (!validateRefs(refs, data)) return json({ message: "Selecciona responsables válidos de este proyecto." }, 400);
    if (isStudent && (!onlySelfOrNone(refs) || (!refs.length && !unassigned(value.assignee)))) return json({ message: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." }, 403);
    const id = crypto.randomUUID(), member = data.members.find(item => item.status === "active" && item.userId === user.userId);
    const statements = [
      binding.prepare(`INSERT INTO tasks (id, project_id, title, description, assignee, due_date, priority, status, created_at, revision, creator_user_id, creator_member_id, creator_name) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ? WHERE ${authSql} RETURNING id`).bind(id, project.id, value.title, value.description, unlinkedAssigneeText(refs, value.assignee), value.dueDate, value.priority, value.status, Date.now(), user.userId, member?.id ?? null, user.displayName, ...authArgs),
      binding.prepare("INSERT INTO user_identities (id, display_name) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?) ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name").bind(user.userId, user.displayName, id, project.id),
      ...refs.map(ref => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ?)").bind(crypto.randomUUID(), id, project.id, ref.kind, ref.profileId, id, project.id)),
    ];
    try { const result = await binding.batch(statements); if (!result[0].results?.length) return json({ message: "Ya no tienes permiso para crear tareas." }, 403); }
    catch { return json({ message: "No se pudo crear la tarea. Comprueba que los responsables y el proyecto siguen disponibles." }, 409); }
    const [created] = await db.select().from(tasks).where(eq(tasks.id, id));
    return json(decorate(created, await projectData(project.id)), 201);
  }
  const parsed = reference.safeParse(body); if (!parsed.success) return json({ message: "La referencia de la tarea no es válida." }, 400);
  const { id, revision } = parsed.data;
  const matches = and(eq(tasks.id, id), eq(tasks.revision, revision), eq(tasks.projectId, project.id), authGuard);
  const [current] = await db.select().from(tasks).where(matches);
  if (!current) return json({ message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." }, 409);
  const currentRefs: Ref[] = data.refs.filter(ref => ref.taskId === id && (ref.kind === "student" || ref.kind === "teacher")).map(ref => ({ kind: ref.kind as Ref["kind"], profileId: ref.profileId }));
  if (request.method === "DELETE") {
    if (isStudent && (!own(currentRefs) || currentRefs.length !== 1)) return json({ message: "Solo puedes eliminar tareas asignadas únicamente a ti." }, 403);
    const ownGuard = isStudent ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${id} AND project_id = ${project.id} AND kind = 'student' AND profile_id = ${selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${id} AND project_id = ${project.id}) = 1` : sql`1 = 1`;
    const [deleted] = await db.delete(tasks).where(and(matches, ownGuard)).returning({ id: tasks.id });
    return deleted ? json(deleted) : json({ message: "Esta tarea cambió en otra sesión." }, 409);
  }
  const change = z.union([fields, fields.pick({ status: true }).strict()]).safeParse(parsed.data.changes);
  if (!change.success) return json({ message: "Revisa los campos de la tarea." }, 400);
  if (!("title" in change.data)) {
    if (isStudent && (!own(currentRefs) || currentRefs.length !== 1)) return json({ message: "Solo puedes editar tareas asignadas únicamente a ti." }, 403);
    const ownGuard = isStudent ? sql`EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ${id} AND project_id = ${project.id} AND kind = 'student' AND profile_id = ${selfId}) AND (SELECT count(*) FROM task_assignees WHERE task_id = ${id} AND project_id = ${project.id}) = 1` : sql`1 = 1`;
    const [updated] = await db.update(tasks).set({ status: change.data.status, revision: sql`${tasks.revision} + 1` }).where(and(matches, ownGuard)).returning();
    return updated ? json(decorate(updated, data)) : json({ message: "Esta tarea cambió en otra sesión." }, 409);
  }
  const value = change.data;
  // A legacy client that omits assignees preserves existing references; it cannot silently take ownership.
  const nextRefs = value.assignees ?? currentRefs;
  if (!validateRefs(nextRefs, data)) return json({ message: "Selecciona responsables válidos de este proyecto." }, 400);
  if (isStudent) {
    const wasOwn = currentRefs.length === 1 && own(currentRefs), claims = currentRefs.length === 0 && unassigned(current.assignee) && own(nextRefs);
    if (!wasOwn && !claims) return json({ message: "Solo puedes editar tus tareas o asignarte una tarea sin responsable." }, 403);
    const otherCurrent = currentRefs.filter(ref => !(ref.kind === "student" && ref.profileId === selfId));
    const otherNext = nextRefs.filter(ref => !(ref.kind === "student" && ref.profileId === selfId));
    if (!sameRefs(otherCurrent, otherNext) || (!nextRefs.length && !unassigned(value.assignee))) return json({ message: "No puedes cambiar la asignación de otras personas." }, 403);
    if (claims && (value.title !== current.title || value.description !== current.description || value.dueDate !== current.dueDate || value.priority !== current.priority || value.status !== current.status)) return json({ message: "Primero asígnate la tarea y guarda. Después podrás editar sus datos." }, 403);
  }
  const token = crypto.randomUUID();
  const referenceGuard = currentRefs.map(() => "AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND project_id = ? AND kind = ? AND profile_id = ?)").join(" ");
  const referenceArgs = currentRefs.flatMap(ref => [id, project.id, ref.kind, ref.profileId]);
  const statements = [
    binding.prepare(`UPDATE tasks SET title = ?, description = ?, assignee = ?, due_date = ?, priority = ?, status = ?, revision = revision + 1, mutation_token = ? WHERE id = ? AND project_id = ? AND revision = ? AND ${authSql} AND (SELECT count(*) FROM task_assignees WHERE task_id = ? AND project_id = ?) = ? ${referenceGuard} RETURNING id`).bind(value.title, value.description, unlinkedAssigneeText(nextRefs, value.assignee), value.dueDate, value.priority, value.status, token, id, project.id, revision, ...authArgs, id, project.id, currentRefs.length, ...referenceArgs),
    binding.prepare("DELETE FROM task_assignees WHERE task_id = ? AND project_id = ? AND EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(id, project.id, id, project.id, token),
    ...nextRefs.map(ref => binding.prepare("INSERT INTO task_assignees (id, task_id, project_id, kind, profile_id) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM tasks WHERE id = ? AND project_id = ? AND mutation_token = ?)").bind(crypto.randomUUID(), id, project.id, ref.kind, ref.profileId, id, project.id, token)),
  ];
  try {
    const result = await binding.batch(statements); if (!result[0].results?.length) return json({ message: "Esta tarea cambió en otra sesión." }, 409);
    const [updated] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, project.id)));
    return updated ? json(decorate(updated, await projectData(project.id))) : json({ message: "La tarea ya no está disponible." }, 409);
  } catch { return json({ message: "No se pudieron guardar los responsables. Comprueba que sus fichas siguen disponibles." }, 409); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
