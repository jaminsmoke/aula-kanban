import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { students, tasks, teachers } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { priorities, statuses } from "../../task";
import { validProject } from "../project";
import { normalizeName } from "../../assignments";

export const dynamic = "force-dynamic";

const fields = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  assignee: z.string().trim().max(80),
  dueDate: z.union([z.literal(""), z.string().date()]),
  priority: z.enum(priorities),
  status: z.enum(statuses),
});
const reference = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  changes: z.unknown().optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(request: Request) {
  if (!(await getChatGPTUser())) {
    return json({ message: "Inicia sesión para acceder al tablero." }, 401);
  }
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);

  if (request.method === "GET") {
    const list = await getDb().select().from(tasks).where(eq(tasks.projectId, project.id)).orderBy(asc(tasks.createdAt), asc(tasks.id));
    return json(list);
  }

  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);

  const mime = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mime !== "application/json") {
    return json({ message: "Formato de solicitud no válido." }, 415);
  }
  const body = await request.json().catch(() => null);
  let ownProfile: typeof students.$inferSelect | undefined;
  let projectStudents: (typeof students.$inferSelect)[] = [];
  let teacherNames: { id: string; name: string }[] = [];
  if (project.access.role === "student") {
    projectStudents = await getDb().select().from(students).where(and(eq(students.projectId, project.id), eq(students.deleted, 0)));
    teacherNames = await getDb().select({ id: teachers.id, name: teachers.name }).from(teachers).where(eq(teachers.projectId, project.id));
    ownProfile = projectStudents.find((student) => student.section === project.access.studentSection);
  }
  const unassigned = (name: string) => !name.trim() || normalizeName(name) === "por definir";
  // A student may edit displayName; never let that mutable display field confer ownership of someone else's task.
  const matchingPeople = [...projectStudents.map(student => ({ ...student, displayName: student.name })), ...teacherNames.map(teacher => ({ section: teacher.id, name: teacher.name, displayName: teacher.name, role: "", activities: "", aiHelp: "", revision: 1 }))];
  const isOwn = (name: string) => Boolean(ownProfile && normalizeName(name) === normalizeName(ownProfile.name) && matchingPeople.filter(person => normalizeName(person.name) === normalizeName(name)).length === 1);

  if (request.method === "POST") {
    const parsed = fields.safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    if (project.access.role === "student" && !unassigned(parsed.data.assignee) && !isOwn(parsed.data.assignee)) {
      return json({ message: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." }, 403);
    }
    const [created] = await getDb().insert(tasks).values({
      ...parsed.data,
      projectId: project.id,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }).returning();
    return json(created, 201);
  }

  const parsed = reference.safeParse(body);
  if (!parsed.success) return json({ message: "La referencia de la tarea no es válida." }, 400);

  const { id, revision } = parsed.data;
  const matches = and(eq(tasks.id, id), eq(tasks.revision, revision), eq(tasks.projectId, project.id));
  const [current] = await getDb().select().from(tasks).where(matches);
  if (!current) return json({ message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." }, 409);
  if (request.method === "DELETE") {
    if (project.access.role === "student" && !isOwn(current.assignee)) return json({ message: "Solo puedes eliminar tus propias tareas." }, 403);
    const [deleted] = await getDb().delete(tasks).where(matches).returning({ id: tasks.id });
    if (deleted) return json(deleted);
  } else {
    const change = z.union([fields, fields.pick({ status: true }).strict()]).safeParse(parsed.data.changes);
    if (!change.success) return json({ message: "Revisa los campos de la tarea." }, 400);
    if (project.access.role === "student") {
      const next = { ...current, ...change.data };
      const ownsTask = isOwn(current.assignee);
      const claimsTask = unassigned(current.assignee) && isOwn(next.assignee);
      if (!ownsTask && !claimsTask) return json({ message: "Solo puedes editar tus tareas o asignarte una tarea sin responsable." }, 403);
      if (!unassigned(next.assignee) && !isOwn(next.assignee)) return json({ message: "Solo puedes asignarte la tarea a ti o dejarla sin asignar." }, 403);
      if (claimsTask && (next.title !== current.title || next.description !== current.description || next.dueDate !== current.dueDate || next.priority !== current.priority || next.status !== current.status)) {
        return json({ message: "Primero asígnate la tarea y guarda. Después podrás editar sus datos." }, 403);
      }
    }
    const [updated] = await getDb().update(tasks)
      .set({ ...change.data, revision: sql`${tasks.revision} + 1` })
      .where(matches).returning();
    if (updated) return json(updated);
  }
  return json({ message: "Esta tarea cambió en otra sesión. Abre la versión actual para continuar." }, 409);
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
