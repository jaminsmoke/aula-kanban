import { env } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, students } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { validProject } from "../project";
import { updateProfile } from "../profile-update";

export const dynamic = "force-dynamic";

const profile = z.object({
  name: z.string().trim().max(80).default(""),
  displayName: z.string().trim().max(80).default(""),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});
const reference = z.object({ section: z.string().min(1).max(80), revision: z.number().int().positive() });
const email = z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Correo no válido").transform(value => value.toLowerCase());
const fields = profile.merge(reference).extend({ accountEmail: email.optional() });

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para acceder a las fichas." }, 401);
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  const db = getDb();
  const current = await db.select().from(students).where(eq(students.projectId, project.id)).orderBy(asc(students.section));
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, project.id));
  return json(current.filter(student => student.deleted === 0).map(student => {
    const member = members.find(item => item.studentSection === student.section);
    const maySeeEmail = project.access.role === "owner" || project.access.role === "admin" || project.access.role === "teacher" || project.access.studentSection === student.section;
    const { mutationToken, ...safeStudent } = student;
    return { ...safeStudent, accountStatus: member?.status ?? "unlinked", ...(maySeeEmail ? { accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null } : {}) };
  }));
}

async function mutate(request: Request) {
  if (!(await getChatGPTUser())) return json({ message: "Inicia sesión para editar las fichas." }, 401);
  const project = await validProject(request);
  if (!project) return json({ message: "No se encuentra el proyecto." }, 404);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ message: "Formato de solicitud no válido." }, 415);
  }
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    if (project.access.role === "student" || project.access.role === "guest") return json({ message: "Solo el profesorado puede crear fichas." }, 403);
    const parsed = profile.extend({ section: z.string().uuid(), accountEmail: email.optional().default("") }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
    const { section, accountEmail, ...values } = parsed.data;
    const name = values.name || values.displayName;
    if (!name) return json({ message: "Escribe un nombre para la ficha." }, 400);
    const db = getDb();
    try {
      const insert = db.insert(students).values({ ...values, name, section, projectId: project.id }).returning();
      const [created] = accountEmail ? (await db.batch([insert, db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email: accountEmail, role: "student", studentSection: section, status: "pending" }).returning()]))[0] : await insert;
      const { mutationToken, ...safeStudent } = created;
      return json({ ...safeStudent, accountStatus: accountEmail ? "pending" : "unlinked", accountEmail }, 201);
    } catch { return json({ message: "No se pudo crear la ficha: comprueba que el correo no esté ya vinculado en este proyecto." }, 409); }
  }
  const parsed = (request.method === "DELETE" ? reference : fields).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision, ...changes } = parsed.data;
  if (project.access.role === "guest" || (project.access.role === "student" && project.access.studentSection !== section)) {
    return json({ message: "Solo puedes editar tu propia ficha." }, 403);
  }
  if (request.method !== "DELETE") {
    const { accountEmail, name, displayName, role, activities, aiHelp } = changes as z.infer<typeof fields>;
    const fullName = name || displayName;
    if (!fullName) return json({ message: "Escribe un nombre para la ficha." }, 400);
    const result = await updateProfile(project, "student", section, revision, { name: fullName, displayName, role, activities, aiHelp }, accountEmail);
    if (!result.ok) return json({ message: result.message }, result.status);
    const db = getDb();
    const [updated] = await db.select().from(students).where(and(eq(students.section, section), eq(students.projectId, project.id)));
    const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.studentSection, section), eq(projectMembers.projectId, project.id)));
    const { mutationToken, ...safeStudent } = updated;
    return json({ ...safeStudent, accountStatus: member?.status ?? "unlinked", accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null });
  }
  // The ficha moves to the history table: assignments keep pointing at it for 30 days, then purge.
  const binding = env.DB;
  if (!binding) return json({ message: "Base de datos no disponible." }, 503);
  const deletedAt = Date.now();
  try {
    const result = await binding.batch([
      binding.prepare(`INSERT INTO deleted_students (section, project_id, name, display_name, user_id, deleted_at)
        SELECT s.section, s.project_id, COALESCE(NULLIF(s.name, ''), s.display_name), s.display_name,
          (SELECT m.user_id FROM project_members m WHERE m.project_id = s.project_id AND m.student_section = s.section), ?
        FROM students s WHERE s.section = ? AND s.project_id = ? AND s.revision = ? AND s.deleted = 0
        ON CONFLICT(section) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, user_id = excluded.user_id, deleted_at = excluded.deleted_at
        RETURNING section`).bind(deletedAt, section, project.id, revision),
      binding.prepare("DELETE FROM project_members WHERE project_id = ? AND student_section = ? AND EXISTS (SELECT 1 FROM deleted_students WHERE section = ? AND deleted_at = ?)").bind(project.id, section, section, deletedAt),
      binding.prepare("DELETE FROM students WHERE section = ? AND project_id = ? AND EXISTS (SELECT 1 FROM deleted_students WHERE section = ? AND deleted_at = ?) RETURNING section").bind(section, project.id, section, deletedAt),
    ]);
    return result[0].results?.length ? json({ section }) : json({ message: "La ficha ha cambiado en otra sesión. Cierra el formulario y vuelve a abrirla para ver los cambios." }, 409);
  } catch { return json({ message: "No se pudo eliminar la ficha. Inténtalo de nuevo." }, 409); }
}

export { mutate as POST, mutate as PATCH, mutate as DELETE };
