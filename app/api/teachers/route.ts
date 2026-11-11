import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, teachers } from "../../../db/schema";
import { validProject } from "../project";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fields = z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().max(500), activities: z.string().trim().max(2000), aiHelp: z.string().trim().max(2000) });
const reference = z.object({ id: z.string().uuid(), revision: z.number().int().positive() });

export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  const db = getDb();
  const list = await db.select().from(teachers).where(eq(teachers.projectId, project.id)).orderBy(asc(teachers.name), asc(teachers.id));
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, project.id));
  return json(list.map(teacher => {
    const member = members.find(item => item.teacherId === teacher.id);
    const maySeeEmail = project.access.role === "owner" || project.access.role === "admin" || project.access.teacherId === teacher.id;
    return { ...teacher, accountStatus: member?.status ?? "unlinked", ...(maySeeEmail ? { accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null } : {}) };
  }));
}
async function mutate(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  if (project.access.role === "student" || project.access.role === "guest") return json({ message: "No tienes permiso para gestionar fichas de profesores." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    if (project.access.role === "teacher") return json({ message: "Solo un administrador puede añadir profesores." }, 403);
    const parsed = fields.extend({ id: z.string().uuid(), accountEmail: z.string().trim().email().max(254).transform(value => value.toLowerCase()) }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la ficha." }, 400);
    try {
      const { accountEmail, ...values } = parsed.data;
      const db = getDb(); const [created] = await db.batch([
        db.insert(teachers).values({ ...values, projectId: project.id }).returning(),
        db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email: accountEmail, role: "teacher", teacherId: values.id, status: "pending" }).returning(),
      ]);
      return json({ ...created[0], accountStatus: "pending", accountEmail }, 201);
    } catch { return json({ message: "No se pudo guardar la ficha. Comprueba que el proyecto sigue disponible." }, 409); }
  }
  const parsed = (request.method === "DELETE" ? reference : fields.merge(reference)).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision, ...changes } = parsed.data;
  if (project.access.role === "teacher" && project.access.teacherId !== id) return json({ message: "Solo puedes gestionar tu propia ficha de profesor." }, 403);
  const where = and(eq(teachers.id, id), eq(teachers.projectId, project.id), eq(teachers.revision, revision));
  const [result] = request.method === "DELETE"
    ? await getDb().delete(teachers).where(where).returning()
    : await getDb().update(teachers).set({ ...changes, revision: sql`${teachers.revision} + 1` }).where(where).returning();
  return result ? json(result) : json({ message: "La ficha ha cambiado en otra sesión. Actualiza la página para verla." }, 409);
}
export { mutate as POST, mutate as PATCH, mutate as DELETE };
