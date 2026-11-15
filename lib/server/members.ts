import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { projectMembers, students, teachers } from "../../db/schema";
import type { Access, ProjectWithAccess } from "./project";

/**
 * Miembros e invitaciones de un proyecto: listar, invitar y retirar cuentas.
 *
 * Extrae la lógica de `app/api/members/route.ts` para que la ruta HTTP y las
 * herramientas MCP de MCP-07 compartan permisos, mensajes y validaciones.
 * Nunca se devuelve `userId`: la web tampoco lo expone.
 */

/** Miembro del proyecto tal como lo ven la web y el MCP, sin `userId`. */
export type Member = Omit<typeof projectMembers.$inferSelect, "userId">;

/** Resultado de listar miembros: la lista o el 403 del contrato. */
export type MemberListResult = { ok: true; miembros: Member[] } | { ok: false; status: number; message: string };

/** Datos de una invitación: correo, rol y la ficha que corresponda. */
const memberInvite = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  role: z.enum(["teacher", "student", "guest"]),
  studentSection: z.string().min(1).max(80).nullable().optional(),
  teacherId: z.string().uuid().nullable().optional(),
});

/** Resultado de invitar: el miembro creado o actualizado, o el fallo del contrato. */
export type MemberInviteResult =
  | { ok: true; miembro: Member; creada: boolean }
  | { ok: false; status: number; message: string };

/** Resultado de retirar un miembro o una invitación. */
export type MemberRemoveResult = { ok: true; id: string } | { ok: false; status: number; message: string };

/** Resultado de buscar un miembro con permiso para retirarlo. */
export type MemberLookupResult = { ok: true; miembro: Member } | { ok: false; status: number; message: string };

/**
 * Quita `userId` de una fila de miembro.
 * @param row - Fila completa de `project_members`.
 * @returns La fila sin el identificador de cuenta.
 */
function sinCuenta({ userId: _userId, ...member }: typeof projectMembers.$inferSelect): Member {
  return member;
}

/**
 * Lista los miembros e invitaciones del proyecto.
 * @param projectId - Proyecto del que se leen los miembros.
 * @param access - Acceso de la cuenta: alumnado e invitados no pueden listar.
 * @returns Los miembros sin `userId` o el 403 del contrato.
 */
export async function listMembers(projectId: string, access: Access): Promise<MemberListResult> {
  if (access.role === "student" || access.role === "guest") {
    return { ok: false, status: 403, message: "No tienes permiso para gestionar miembros." };
  }
  const rows = await getDb()
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(projectMembers.email));
  return {
    ok: true,
    miembros: rows
      .filter((row) => access.role !== "teacher" || row.role === "student" || row.userId === access.user.userId)
      .map(sinCuenta),
  };
}

/**
 * Crea una invitación `pending` o actualiza el correo de una ya existente.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param body - Cuerpo con correo, rol y ficha opcional.
 * @returns El miembro resultante con `creada` o el fallo del contrato.
 */
export async function inviteMember(project: ProjectWithAccess, body: unknown): Promise<MemberInviteResult> {
  const parsed = memberInvite.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, message: "Revisa el correo y el rol." };
  const { email, role } = parsed.data;
  const studentSection = parsed.data.studentSection ?? null;
  const teacherId = parsed.data.teacherId ?? null;
  if (
    (role === "student" && (!studentSection || teacherId)) ||
    (role === "teacher" && (!teacherId || studentSection)) ||
    (role === "guest" && (studentSection || teacherId))
  ) {
    return { ok: false, status: 400, message: "Selecciona una ficha válida para el rol." };
  }
  const access = project.access;
  const privileged = access.role === "owner" || access.role === "admin";
  const teacherStudent = access.role === "teacher" && role === "student";
  const self =
    (access.role === "student" && role === "student" && studentSection === access.studentSection) ||
    (access.role === "teacher" && role === "teacher" && teacherId === access.teacherId);
  if (!privileged && !teacherStudent && !self) {
    return { ok: false, status: 403, message: "No tienes permiso para vincular esta cuenta." };
  }
  const db = getDb();
  if (studentSection) {
    const [row] = await db
      .select()
      .from(students)
      .where(and(eq(students.section, studentSection), eq(students.projectId, project.id), eq(students.deleted, 0)));
    if (!row) return { ok: false, status: 400, message: "La ficha de alumno no está disponible." };
  }
  if (teacherId) {
    const [row] = await db.select().from(teachers).where(and(eq(teachers.id, teacherId), eq(teachers.projectId, project.id)));
    if (!row) return { ok: false, status: 400, message: "La ficha de profesor no está disponible." };
  }
  const condition = studentSection
    ? eq(projectMembers.studentSection, studentSection)
    : teacherId
      ? eq(projectMembers.teacherId, teacherId)
      : eq(projectMembers.email, email);
  const [existing] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, project.id), condition));
  if (existing && existing.role !== role) {
    return { ok: false, status: 409, message: "Esa cuenta ya tiene otro rol en el proyecto." };
  }
  try {
    if (existing) {
      if (existing.email === email) return { ok: true, miembro: sinCuenta(existing), creada: false };
      const [updated] = await db
        .update(projectMembers)
        .set({ email, status: "pending", userId: null })
        .where(and(eq(projectMembers.id, existing.id), eq(projectMembers.projectId, project.id), eq(projectMembers.email, existing.email)))
        .returning();
      return updated
        ? { ok: true, miembro: sinCuenta(updated), creada: false }
        : { ok: false, status: 409, message: "La invitación ha cambiado. Actualiza y vuelve a intentarlo." };
    }
    const [created] = await db
      .insert(projectMembers)
      .values({ id: crypto.randomUUID(), projectId: project.id, email, role, studentSection, teacherId, status: "pending" })
      .returning();
    return { ok: true, miembro: sinCuenta(created), creada: true };
  } catch {
    return { ok: false, status: 409, message: "Ese correo o ficha ya está vinculado a otra cuenta del proyecto." };
  }
}

/**
 * Busca un miembro del proyecto y comprueba que la cuenta puede retirarlo.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param id - Identificador del miembro.
 * @returns El miembro sin `userId`, 404 si no existe o 403 si no puede retirarlo.
 */
export async function findMember(project: ProjectWithAccess, id: string): Promise<MemberLookupResult> {
  const [member] = await getDb()
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.id, id), eq(projectMembers.projectId, project.id)));
  if (!member) return { ok: false, status: 404, message: "Ese miembro ya no está disponible." };
  const access = project.access;
  const allowed =
    access.role === "owner" ||
    access.role === "admin" ||
    (access.role === "teacher" && member.role === "student") ||
    (member.userId === access.user.userId && (access.role === "student" || access.role === "teacher"));
  if (!allowed) return { ok: false, status: 403, message: "No tienes permiso para retirar esta cuenta." };
  return { ok: true, miembro: sinCuenta(member) };
}

/**
 * Retira un miembro o una invitación del proyecto con las reglas de la web.
 * @param project - Proyecto validado con el acceso de la cuenta.
 * @param id - Identificador del miembro.
 * @returns El id retirado o el fallo del contrato.
 */
export async function removeMember(project: ProjectWithAccess, id: string): Promise<MemberRemoveResult> {
  const found = await findMember(project, id);
  if (!found.ok) return found;
  const [deleted] = await getDb()
    .delete(projectMembers)
    .where(and(eq(projectMembers.id, found.miembro.id), eq(projectMembers.projectId, project.id)))
    .returning({ id: projectMembers.id });
  return deleted ? { ok: true, id: deleted.id } : { ok: false, status: 404, message: "Ese miembro ya no está disponible." };
}
