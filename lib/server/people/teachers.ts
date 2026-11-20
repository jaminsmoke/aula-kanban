import { env } from "cloudflare:workers";
import { findMemberRowByTeacherId, listProjectMemberRows } from "../access/members-repository";
import { updateProfile } from "../access/profile-update";
import type { Access, ProjectWithAccess } from "../projects/project-access";
import { maySeeTeacherEmail, type BajaResult, type FichaResult } from "./campos";
import { deleteTeacherWithHistory, findTeacherRow, insertTeacherRow, listTeacherRows, type TeacherRow } from "./teachers-repository";

/**
 * Fichas de profesorado: la lista que pinta la web y las altas, ediciones y
 * bajas (histórico de 30 días) de `/api/teachers`. La lógica vive aquí para
 * que la ruta HTTP y el catálogo MCP (MCP-06) compartan permisos y mensajes.
 * El acceso D1 vive en `teachers-repository.ts`.
 */

/** Valores de una ficha que llegan desde la web o desde el MCP. */
export type TeacherInput = { name: string; displayName: string; role: string; activities: string; aiHelp: string };

/** Ficha de profesor con su estado de cuenta y, si procede, el correo vinculado. */
export type TeacherFicha = Omit<TeacherRow, "mutationToken"> & {
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
  const list = await listTeacherRows(projectId);
  const members = await listProjectMemberRows(projectId);
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
  try {
    const created = await insertTeacherRow(project.id, { ...values, id }, email);
    if (!created) throw new Error("El alta no devolvió la ficha creada.");
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
  const updated = await findTeacherRow(project.id, id);
  if (!updated) throw new Error("La ficha actualizada no está disponible.");
  const member = await findMemberRowByTeacherId(project.id, id);
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
  try {
    const deleted = await deleteTeacherWithHistory(binding, project.id, id, revision);
    return deleted
      ? { ok: true }
      : { ok: false, status: 409, message: "La ficha ha cambiado en otra sesión. Actualiza la página para verla." };
  } catch {
    return { ok: false, status: 409, message: "No se pudo eliminar la ficha. Inténtalo de nuevo." };
  }
}
