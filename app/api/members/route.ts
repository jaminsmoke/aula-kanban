import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { projectMembers, students, teachers } from "../../../db/schema";
import { projectFailureResponse, resolveProject } from "../../../lib/server/project";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
const form = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), role: z.enum(["teacher", "student", "guest"]), studentSection: z.string().min(1).max(80).nullable().optional(), teacherId: z.string().uuid().nullable().optional() });

/**
 * Lista los miembros e invitaciones del proyecto.
 * @param request - Petición con el proyecto en la URL.
 * @returns Respuesta JSON con los miembros sin exponer `userId`.
 */
export async function GET(request: Request) {
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  if (project.access.role === "student" || project.access.role === "guest") return json({ message: "No tienes permiso para gestionar miembros." }, 403);
  const rows = await getDb().select().from(projectMembers).where(eq(projectMembers.projectId, project.id)).orderBy(asc(projectMembers.email));
  return json(rows.filter(row => project.access.role !== "teacher" || row.role === "student" || row.userId === project.access.user.userId).map(({ userId, ...row }) => row));
}
/**
 * Crea una invitación `pending` para un correo con rol y ficha opcional.
 * @param request - Petición con correo, rol y ficha a vincular.
 * @returns Respuesta JSON con la invitación creada o actualizada.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  const parsed = form.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Revisa el correo y el rol." }, 400);
  const { email, role } = parsed.data;
  const studentSection = parsed.data.studentSection ?? null, teacherId = parsed.data.teacherId ?? null;
  if ((role === "student" && (!studentSection || teacherId)) || (role === "teacher" && (!teacherId || studentSection)) || (role === "guest" && (studentSection || teacherId))) return json({ message: "Selecciona una ficha válida para el rol." }, 400);
  const access = project.access;
  const privileged = access.role === "owner" || access.role === "admin";
  const teacherStudent = access.role === "teacher" && role === "student";
  const self = (access.role === "student" && role === "student" && studentSection === access.studentSection) || (access.role === "teacher" && role === "teacher" && teacherId === access.teacherId);
  if (!privileged && !teacherStudent && !self) return json({ message: "No tienes permiso para vincular esta cuenta." }, 403);
  const db = getDb();
  if (studentSection) { const [row] = await db.select().from(students).where(and(eq(students.section, studentSection), eq(students.projectId, project.id), eq(students.deleted, 0))); if (!row) return json({ message: "La ficha de alumno no está disponible." }, 400); }
  if (teacherId) { const [row] = await db.select().from(teachers).where(and(eq(teachers.id, teacherId), eq(teachers.projectId, project.id))); if (!row) return json({ message: "La ficha de profesor no está disponible." }, 400); }
  const condition = studentSection ? eq(projectMembers.studentSection, studentSection) : teacherId ? eq(projectMembers.teacherId, teacherId) : eq(projectMembers.email, email);
  const [existing] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, project.id), condition));
  if (existing && existing.role !== role) return json({ message: "Esa cuenta ya tiene otro rol en el proyecto." }, 409);
  try {
    if (existing) {
      if (existing.email === email) return json({ ...existing, userId: undefined });
      const [updated] = await db.update(projectMembers).set({ email, status: "pending", userId: null }).where(and(eq(projectMembers.id, existing.id), eq(projectMembers.projectId, project.id), eq(projectMembers.email, existing.email))).returning();
      return updated ? json({ ...updated, userId: undefined }) : json({ message: "La invitación ha cambiado. Actualiza y vuelve a intentarlo." }, 409);
    }
    const [created] = await db.insert(projectMembers).values({ id: crypto.randomUUID(), projectId: project.id, email, role, studentSection, teacherId, status: "pending" }).returning();
    return json({ ...created, userId: undefined }, 201);
  } catch { return json({ message: "Ese correo o ficha ya está vinculado a otra cuenta del proyecto." }, 409); }
}
/**
 * Retira un miembro o invitación del proyecto.
 * @param request - Petición con el identificador del miembro.
 * @returns Respuesta JSON con el identificador retirado o el error.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Miembro no válido." }, 400);
  const db = getDb(); const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.id, parsed.data.id), eq(projectMembers.projectId, project.id)));
  if (!member) return json({ message: "Ese miembro ya no está disponible." }, 404);
  const a = project.access;
  const allowed = a.role === "owner" || a.role === "admin" || (a.role === "teacher" && member.role === "student") || (member.userId === a.user.userId && (a.role === "student" || a.role === "teacher"));
  if (!allowed) return json({ message: "No tienes permiso para retirar esta cuenta." }, 403);
  const [deleted] = await db.delete(projectMembers).where(and(eq(projectMembers.id, member.id), eq(projectMembers.projectId, project.id))).returning({ id: projectMembers.id });
  return deleted ? json(deleted) : json({ message: "Ese miembro ya no está disponible." }, 404);
}
