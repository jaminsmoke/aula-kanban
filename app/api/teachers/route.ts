import { env } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, teachers } from "../../../db/schema";
import { validProject } from "../project";
import { updateProfile } from "../profile-update";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fields = z.object({ name: z.string().trim().min(1).max(80), displayName: z.string().trim().max(80).default(""), role: z.string().trim().max(500), activities: z.string().trim().max(2000), aiHelp: z.string().trim().max(2000) });
const email = z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Correo no válido").transform(value => value.toLowerCase());
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
    const { mutationToken, ...safeTeacher } = teacher;
    return { ...safeTeacher, accountStatus: member?.status ?? "unlinked", ...(maySeeEmail ? { accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null } : {}) };
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
    const parsed = fields.extend({ id: z.string().uuid(), accountEmail: email.optional().default("") }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la ficha." }, 400);
    try {
      const { accountEmail, ...values } = parsed.data;
      const db = getDb(); const insert = db.insert(teachers).values({ ...values, projectId: project.id }).returning();
      const [created] = accountEmail ? (await db.batch([insert, db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email: accountEmail, role: "teacher", teacherId: values.id, status: "pending" }).returning()]))[0] : await insert;
      const { mutationToken, ...safeTeacher } = created;
      return json({ ...safeTeacher, accountStatus: accountEmail ? "pending" : "unlinked", accountEmail }, 201);
    } catch { return json({ message: "No se pudo guardar la ficha. Comprueba que el correo no esté ya vinculado y que el proyecto siga disponible." }, 409); }
  }
  const parsed = (request.method === "DELETE" ? reference : fields.merge(reference).extend({ accountEmail: email.optional() })).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision } = parsed.data;
  if (project.access.role === "teacher" && project.access.teacherId !== id) return json({ message: "Solo puedes gestionar tu propia ficha de profesor." }, 403);
  if (request.method === "DELETE") {
    // The ficha moves to the history table: assignments keep pointing at it for 30 days, then purge.
    const binding = env.DB;
    if (!binding) return json({ message: "Base de datos no disponible." }, 503);
    const deletedAt = Date.now();
    try {
      const result = await binding.batch([
        binding.prepare(`INSERT INTO deleted_teachers (id, project_id, name, display_name, user_id, deleted_at)
          SELECT t.id, t.project_id, t.name, t.display_name,
            (SELECT m.user_id FROM project_members m WHERE m.project_id = t.project_id AND m.teacher_id = t.id), ?
          FROM teachers t WHERE t.id = ? AND t.project_id = ? AND t.revision = ?
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, user_id = excluded.user_id, deleted_at = excluded.deleted_at
          RETURNING id`).bind(deletedAt, id, project.id, revision),
        binding.prepare("DELETE FROM project_members WHERE project_id = ? AND teacher_id = ? AND EXISTS (SELECT 1 FROM deleted_teachers WHERE id = ? AND deleted_at = ?)").bind(project.id, id, id, deletedAt),
        binding.prepare("DELETE FROM teachers WHERE id = ? AND project_id = ? AND EXISTS (SELECT 1 FROM deleted_teachers WHERE id = ? AND deleted_at = ?) RETURNING id").bind(id, project.id, id, deletedAt),
      ]);
      return result[0].results?.length ? json({ id }) : json({ message: "La ficha ha cambiado en otra sesión. Actualiza la página para verla." }, 409);
    } catch { return json({ message: "No se pudo eliminar la ficha. Inténtalo de nuevo." }, 409); }
  }
  const changes = parsed.data as unknown as z.infer<typeof fields> & { accountEmail?: string };
  const { accountEmail, name, displayName, role, activities, aiHelp } = changes;
  const result = await updateProfile(project, "teacher", id, revision, { name, displayName, role, activities, aiHelp }, accountEmail);
  if (!result.ok) return json({ message: result.message }, result.status);
  const db = getDb();
  const [updated] = await db.select().from(teachers).where(and(eq(teachers.id, id), eq(teachers.projectId, project.id)));
  const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.teacherId, id), eq(projectMembers.projectId, project.id)));
  const { mutationToken, ...safeTeacher } = updated;
  return json({ ...safeTeacher, accountStatus: member?.status ?? "unlinked", accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null });
}
export { mutate as POST, mutate as PATCH, mutate as DELETE };
