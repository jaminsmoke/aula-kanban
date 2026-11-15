import { env } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, students } from "../../../db/schema";
import { isJsonRequest, isSameOrigin, json } from "../http";
import { updateProfile } from "../profile-update";
import { projectFailureResponse } from "../project-http";
import { resolveProject, type Access, type ProjectWithAccess } from "../project-access";
import { accountEmail, maySeeStudentEmail, studentReference, type BajaResult, type FichaResult } from "./campos";

/**
 * Fichas de alumnado: la lista que pinta la web y las altas, ediciones y
 * bajas (histórico de 30 días) de `/api/students`. La lógica vive aquí para
 * que la ruta HTTP y el catálogo MCP (MCP-06) compartan permisos y mensajes.
 */

/** Campos editables de una ficha de alumno; el nombre puede venir vacío al crear. */
const profile = z.object({
  name: z.string().trim().max(80).default(""),
  displayName: z.string().trim().max(80).default(""),
  role: z.string().trim().max(500),
  activities: z.string().trim().max(2000),
  aiHelp: z.string().trim().max(2000),
});
const fields = profile.merge(studentReference).extend({ accountEmail: accountEmail.optional() });

/** Valores de una ficha que llegan desde la web o desde el MCP. */
export type StudentInput = { name: string; displayName: string; role: string; activities: string; aiHelp: string };

/** Ficha de alumno con su estado de cuenta y, si procede, el correo vinculado. */
export type StudentFicha = Omit<typeof students.$inferSelect, "mutationToken"> & {
  accountStatus: string;
  accountEmail?: string;
  accountMemberId?: string | null;
};

/**
 * Lista las fichas de alumnos activas del proyecto con su estado de cuenta.
 * @param projectId - Proyecto del que se leen las fichas.
 * @param access - Acceso de la cuenta, para decidir quién ve el correo.
 * @returns Las fichas sin el token de mutación.
 */
export async function listStudents(projectId: string, access: Access): Promise<StudentFicha[]> {
  const db = getDb();
  const rows = await db.select().from(students).where(eq(students.projectId, projectId)).orderBy(asc(students.section));
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  return rows
    .filter((student) => student.deleted === 0)
    .map((student) => {
      const member = members.find((item) => item.studentSection === student.section);
      const { mutationToken: _token, ...safeStudent } = student;
      return {
        ...safeStudent,
        accountStatus: member?.status ?? "unlinked",
        ...(maySeeStudentEmail(access, student.section)
          ? { accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null }
          : {}),
      };
    });
}

/**
 * Crea una ficha de alumno; con correo, deja la invitación pendiente.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param input - Valores de la ficha, su sección y el correo opcional.
 * @returns La ficha creada o el error del contrato.
 */
export async function createStudent(
  project: ProjectWithAccess,
  input: StudentInput & { section: string; accountEmail: string },
): Promise<FichaResult<StudentFicha>> {
  const name = input.name || input.displayName;
  if (!name) return { ok: false, status: 400, message: "Escribe un nombre para la ficha." };
  const { section, accountEmail: email, ...values } = input;
  const db = getDb();
  try {
    const insert = db.insert(students).values({ ...values, name, section, projectId: project.id }).returning();
    const [created] = email
      ? (
          await db.batch([
            insert,
            db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email, role: "student", studentSection: section, status: "pending" }).returning(),
          ])
        )[0]
      : await insert;
    const { mutationToken: _token, ...safeStudent } = created;
    return { ok: true, ficha: { ...safeStudent, accountStatus: email ? "pending" : "unlinked", accountEmail: email } };
  } catch {
    return { ok: false, status: 409, message: "No se pudo crear la ficha: comprueba que el correo no esté ya vinculado en este proyecto." };
  }
}

/**
 * Edita una ficha de alumno condicionada a su revisión.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param section - Sección de la ficha.
 * @param revision - Revisión esperada.
 * @param values - Nuevos valores de la ficha.
 * @param email - Correo a vincular; `undefined` deja la invitación como está.
 * @returns La ficha actualizada o el error del contrato.
 */
export async function updateStudent(
  project: ProjectWithAccess,
  section: string,
  revision: number,
  values: StudentInput,
  email?: string,
): Promise<FichaResult<StudentFicha>> {
  const name = values.name || values.displayName;
  if (!name) return { ok: false, status: 400, message: "Escribe un nombre para la ficha." };
  const result = await updateProfile(project, "student", section, revision, { ...values, name }, email);
  if (!result.ok) return result;
  const db = getDb();
  const [updated] = await db.select().from(students).where(and(eq(students.section, section), eq(students.projectId, project.id)));
  const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.studentSection, section), eq(projectMembers.projectId, project.id)));
  const { mutationToken: _token, ...safeStudent } = updated;
  return {
    ok: true,
    ficha: { ...safeStudent, accountStatus: member?.status ?? "unlinked", accountEmail: member?.email ?? "", accountMemberId: member?.id ?? null },
  };
}

/**
 * Elimina una ficha de alumno: pasa al histórico de 30 días y retira su
 * cuenta del proyecto.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param section - Sección de la ficha.
 * @param revision - Revisión esperada; si no coincide, 409.
 * @returns `ok` o el error del contrato.
 */
export async function deleteStudent(project: ProjectWithAccess, section: string, revision: number): Promise<BajaResult> {
  // The ficha moves to the history table: assignments keep pointing at it for 30 days, then purge.
  const binding = env.DB;
  if (!binding) return { ok: false, status: 503, message: "Base de datos no disponible." };
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
    return result[0].results?.length
      ? { ok: true }
      : { ok: false, status: 409, message: "La ficha ha cambiado en otra sesión. Cierra el formulario y vuelve a abrirla para ver los cambios." };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha. Inténtalo de nuevo." };
  }
}

/**
 * Crea, edita o elimina (histórico de 30 días) una ficha de alumno.
 * @param request - Petición POST, PATCH o DELETE con los datos de la ficha.
 * @returns Respuesta JSON con la ficha resultante o el error.
 */
export async function mutateStudent(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  const body = await request.json().catch(() => null);
  if (request.method === "POST") {
    if (project.access.role === "student" || project.access.role === "guest") return json({ message: "Solo el profesorado puede crear fichas." }, 403);
    const parsed = profile.extend({ section: z.string().uuid(), accountEmail: accountEmail.optional().default("") }).safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
    const { section, accountEmail: email, ...values } = parsed.data;
    const result = await createStudent(project, { ...values, section, accountEmail: email });
    if (!result.ok) return json({ message: result.message }, result.status);
    return json(result.ficha, 201);
  }
  const parsed = (request.method === "DELETE" ? studentReference : fields).safeParse(body);
  if (!parsed.success) return json({ message: "Revisa los campos del perfil." }, 400);
  const { section, revision, ...changes } = parsed.data;
  if (project.access.role === "guest" || (project.access.role === "student" && project.access.studentSection !== section)) {
    return json({ message: "Solo puedes editar tu propia ficha." }, 403);
  }
  if (request.method !== "DELETE") {
    const { accountEmail: email, name, displayName, role, activities, aiHelp } = changes as z.infer<typeof fields>;
    const result = await updateStudent(project, section, revision, { name, displayName, role, activities, aiHelp }, email);
    if (!result.ok) return json({ message: result.message }, result.status);
    return json(result.ficha);
  }
  const result = await deleteStudent(project, section, revision);
  return result.ok ? json({ section }) : json({ message: result.message }, result.status);
}
