import { env } from "cloudflare:workers";
import { findMemberRowByStudentSection, listProjectMemberRows } from "../access/members-repository";
import { updateProfile } from "../access/profile-update";
import type { Access, ProjectWithAccess } from "../projects/project-access";
import { maySeeStudentEmail, type BajaResult, type FichaResult } from "./campos";
import { deleteStudentWithHistory, findStudentRow, insertStudentRow, listStudentRows, type StudentRow } from "./students-repository";

/**
 * Fichas de alumnado: la lista que pinta la web y las altas, ediciones y
 * bajas (histórico de 30 días) de `/api/students`. La lógica vive aquí para
 * que la ruta HTTP y el catálogo MCP (MCP-06) compartan permisos y mensajes.
 * El acceso D1 vive en `students-repository.ts`.
 */

/** Valores de una ficha que llegan desde la web o desde el MCP. */
export type StudentInput = { name: string; displayName: string; role: string; activities: string; aiHelp: string };

/** Ficha de alumno con su estado de cuenta y, si procede, el correo vinculado. */
export type StudentFicha = Omit<StudentRow, "mutationToken"> & {
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
  const rows = await listStudentRows(projectId);
  const members = await listProjectMemberRows(projectId);
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
  try {
    const created = await insertStudentRow(project.id, { ...values, name, section }, email);
    if (!created) throw new Error("El alta no devolvió la ficha creada.");
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
  const updated = await findStudentRow(project.id, section);
  if (!updated) throw new Error("La ficha actualizada no está disponible.");
  const member = await findMemberRowByStudentSection(project.id, section);
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
  try {
    const deleted = await deleteStudentWithHistory(binding, project.id, section, revision);
    return deleted
      ? { ok: true }
      : { ok: false, status: 409, message: "La ficha ha cambiado en otra sesión. Cierra el formulario y vuelve a abrirla para ver los cambios." };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha. Inténtalo de nuevo." };
  }
}
