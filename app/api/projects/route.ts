import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { blocklyPrograms, boards, deletedStudents, deletedTeachers, projectMembers, projects, students, taskAssignees, tasks, teachers, userIdentities } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAdministrator, isOwner } from "../../../lib/server/project";
import { cleanupOrphanUploads, deleteProjectUploads } from "../../../lib/server/storage";

export const dynamic = "force-dynamic";
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Lista los proyectos accesibles para la cuenta autenticada.
 * @returns Respuesta JSON con proyectos, rol y banderas de propietario/administrador.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para acceder a los proyectos." }, 401);
  const owner = isOwner(user);
  await getDb().update(userIdentities).set({ displayName: user.displayName }).where(eq(userIdentities.id, user.userId));
  const admin = !owner && await isAdministrator(user);
  if (owner || admin) {
    try { await cleanupOrphanUploads(); } catch { /* Se reintentará al volver a cargar proyectos. */ }
  }
  const all = await getDb().select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id));
  if (owner || admin) return json({ projects: all.map((project) => ({ ...project, role: owner ? "owner" : "admin", studentSection: null, teacherId: null })), isOwner: owner, isAdmin: admin });
  const members = await getDb().select().from(projectMembers).where(eq(projectMembers.userId, user.userId));
  return json({ projects: all.flatMap((project) => {
    const member = members.find((item) => item.projectId === project.id);
    return member?.status === "active" ? [{ ...project, role: member.role, studentSection: member.studentSection, teacherId: member.teacherId }] : [];
  }), isOwner: false });
}

/**
 * Crea un proyecto nuevo (solo propietario o administrador).
 * @param request - Petición con identificador y nombre del proyecto.
 * @returns Respuesta JSON con el proyecto creado.
 */
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !(isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden crear proyectos." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Escribe un nombre de hasta 80 caracteres." }, 400);
  const [created] = await getDb().insert(projects).values({ ...parsed.data, createdAt: Date.now() }).onConflictDoNothing().returning();
  if (created) return json(created, 201);
  const [existing] = await getDb().select().from(projects).where(eq(projects.id, parsed.data.id));
  if (existing?.name === parsed.data.name) return json(existing);
  return json({ message: "No se pudo crear el proyecto. Vuelve a intentarlo." }, 409);
}

/**
 * Elimina un proyecto con sus tareas, fichas, miembros e histórico.
 * @param request - Petición con el identificador del proyecto.
 * @returns Respuesta JSON con el identificador y si se borró.
 */
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !(isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden eliminar proyectos." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Formato no válido." }, 415);
  const parsed = z.object({ id: z.string().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Proyecto no válido." }, 400);
  const db = getDb();
  const [, , , , , , , , , result] = await db.batch([
    db.delete(boards).where(eq(boards.projectId, parsed.data.id)),
    db.delete(blocklyPrograms).where(eq(blocklyPrograms.projectId, parsed.data.id)),
    db.delete(taskAssignees).where(eq(taskAssignees.projectId, parsed.data.id)),
    db.delete(tasks).where(eq(tasks.projectId, parsed.data.id)),
    db.delete(projectMembers).where(eq(projectMembers.projectId, parsed.data.id)),
    db.delete(students).where(eq(students.projectId, parsed.data.id)),
    db.delete(teachers).where(eq(teachers.projectId, parsed.data.id)),
    db.delete(deletedStudents).where(eq(deletedStudents.projectId, parsed.data.id)),
    db.delete(deletedTeachers).where(eq(deletedTeachers.projectId, parsed.data.id)),
    db.delete(projects).where(eq(projects.id, parsed.data.id)),
  ]);
  try {
    await deleteProjectUploads(parsed.data.id);
  } catch {
    return json({ message: "El proyecto se ha eliminado, pero no se han podido limpiar todos sus archivos. Vuelve a intentarlo." }, 503);
  }
  return json({ id: parsed.data.id, deleted: Boolean(result.meta.changes) });
}
