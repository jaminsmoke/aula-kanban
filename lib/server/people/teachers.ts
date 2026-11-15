import { env } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, teachers } from "../../../db/schema";
import { isJsonRequest, isSameOrigin, json } from "../http";
import { updateProfile } from "../profile-update";
import { projectFailureResponse } from "../project-http";
import { resolveProject, type Access, type ProjectWithAccess } from "../project-access";
import { accountEmail, maySeeTeacherEmail, teacherReference, type BajaResult, type FichaResult } from "./campos";

/**
 * Fichas de profesorado: la lista que pinta la web y las altas, ediciones y
 * bajas (histórico de 30 días) de `/api/teachers`. La lógica vive aquí para
 * que la ruta HTTP y el catálogo MCP (MCP-06) compartan permisos y mensajes.
 */

/** Campos editables de una ficha de profesor; el nombre es obligatorio. */
const fields = z.object({
  name: z.string().trim().min(1).max(80),
  displayName: z.string().trim().max(80).default(""),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});

/** Valores de una ficha que llegan desde la web o desde el MCP. */
export type TeacherInput = { name: string; displayName: string; role: string; activities: string; aiHelp: string };

/** Ficha de profesor con su estado de cuenta y, si procede, el correo vinculado. */
export type TeacherFicha = Omit<typeof teachers.$inferSelect, "mutationToken"> & {
  accountStatus: string;
  accountEmail?: string;
  accountMemberId?: string | null;
};

/**
 * Lista las fichas de profesorado del proyecto con su estado de cuenta.
 * @param projectId - Proyecto del que se leen las fichas.
 * @param access - Acceso de la cuenta, para decidir quién ve el correo.
 * @returns Las fichas sin el token de mutación.
 */
export async function listTeachers(projectId: string, access: Access): Promise<TeacherFicha[]> {
  const db = getDb();
  const list = await db.select().from(teachers).where(eq(teachers.projectId, projectId)).orderBy(asc(teachers.name), asc(teachers.id));
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  return list.map((teacher) => {
    const member = members.find((item) => item.teacherId === teacher.id);
    const { mutationToken: _token, ...safeTeacher } = teacher;
    return {
      ...safeTeacher,
      accountStatus: member?.status ?? "unlinked",
      ...(maySeeTeacherEmail(access, teacher.id) ? { accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null } : {}),
    };
  });
}

/**
 * Crea una ficha de profesor; con correo, deja la invitación pendiente.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param input - Valores de la ficha, su id y el correo opcional.
 * @returns La ficha creada o el error del contrato.
 */
export async function createTeacher(
  project: ProjectWithAccess,
  input: TeacherInput & { id: string; accountEmail: string },
): Promise<FichaResult<TeacherFicha>> {
  if (!input.name.trim()) return { ok: false, status: 400, message: "Revisa los campos de la ficha." };
  const { id, accountEmail: email, ...values } = input;
  const db = getDb();
  try {
    const insert = db.insert(teachers).values({ ...values, id, projectId: project.id }).returning();
    const [created] = email
      ? (
          await db.batch([
            insert,
            db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email, role: "teacher", teacherId: id, status: "pending" }).returning(),
          ])
        )[0]
      : await insert;
    const { mutationToken: _token, ...safeTeacher } = created;
    return { ok: true, ficha: { ...safeTeacher, accountStatus: email ? "pending" : "unlinked", accountEmail: email } };
  } catch {
    return { ok: false, status: 409, message: "No se pudo guardar la ficha. Comprueba que el correo no esté ya vinculado y que el proyecto siga disponible." };
  }
}

/**
 * Edita una ficha de profesor condicionada a su revisión.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param id - Identificador de la ficha.
 * @param revision - Revisión esperada.
 * @param values - Nuevos valores de la ficha.
 * @param email - Correo a vincular; `undefined` deja la invitación como está.
 * @returns La ficha actualizada o el error del contrato.
 */
export async function updateTeacher(
  project: ProjectWithAccess,
  id: string,
  revision: number,
  values: TeacherInput,
  email?: string,
): Promise<FichaResult<TeacherFicha>> {
  const result = await updateProfile(project, "teacher", id, revision, values, email);
  if (!result.ok) return result;
  const db = getDb();
  const [updated] = await db.select().from(teachers).where(and(eq(teachers.id, id), eq(teachers.projectId, project.id)));
  const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.teacherId, id), eq(projectMembers.projectId, project.id)));
  const { mutationToken: _token, ...safeTeacher } = updated;
  return {
    ok: true,
    ficha: { ...safeTeacher, accountStatus: member?.status ?? "unlinked", accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null },
  };
}

/**
 * Elimina una ficha de profesor: pasa al histórico de 30 días y retira su
 * cuenta del proyecto.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param id - Identificador de la ficha.
 * @param revision - Revisión esperada; si no coincide, 409.
 * @returns `ok` o el error del contrato.
 */
export async function deleteTeacher(project: ProjectWithAccess, id: string, revision: number): Promise<BajaResult> {
  // The ficha moves to the history table: assignments keep pointing at it for 30 days, then purge.
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
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
    return result[0].results?.length
      ? { ok: true }
      : { ok: false, status: 409, message: "La ficha ha cambiado en otra sesión. Actualiza la página para verla." };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha. Inténtalo de nuevo." };
  }
}

/**
 * Crea, edita o elimina (histórico de 30 días) una ficha de profesor.
 * @param request - Petición POST, PATCH o DELETE con los datos de la ficha.
 * @returns Respuesta JSON con la ficha resultante o el error.
 */
export async function mutateTeacher(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  if (project.access.role === "student" || project.access.role === "guest") return json({ message: "No tienes permiso para gestionar fichas de profesores." }, 403);
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    if (project.access.role === "teacher") return json({ message: "Solo un administrador puede añadir profesores." }, 403);
    const parsed = fields.extend({ id: z.string().uuid(), accountEmail: accountEmail.optional().default("") }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos de la ficha." }, 400);
    const { id, accountEmail: email, ...values } = parsed.data;
    const result = await createTeacher(project, { ...values, id, accountEmail: email });
    if (!result.ok) return json({ message: result.message }, result.status);
    return json(result.ficha, 201);
  }
  const parsed = (request.method === "DELETE" ? teacherReference : fields.merge(teacherReference).extend({ accountEmail: accountEmail.optional() })).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los datos de la ficha." }, 400);
  const { id, revision } = parsed.data;
  if (project.access.role === "teacher" && project.access.teacherId !== id) return json({ message: "Solo puedes gestionar tu propia ficha de profesor." }, 403);
  if (request.method === "DELETE") {
    const result = await deleteTeacher(project, id, revision);
    return result.ok ? json({ id }) : json({ message: result.message }, result.status);
  }
  const changes = parsed.data as unknown as z.infer<typeof fields> & { accountEmail?: string };
  const { accountEmail: email, name, displayName, role, activities, aiHelp } = changes;
  const result = await updateTeacher(project, id, revision, { name, displayName, role, activities, aiHelp }, email);
  if (!result.ok) return json({ message: result.message }, result.status);
  return json(result.ficha);
}
