import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getD1, getDb } from "../../../db";
import { projectMembers, projects, userIdentities } from "../../../db/schema";
import { getChatGPTUser } from "../../../lib/server/auth";
import { isAdministrator, isOwner, projectFailureResponse } from "../../../lib/server/project-access";
import { createProject, deleteProject } from "../../../lib/server/projects";
import { cleanupOrphanUploads } from "../../../lib/server/storage";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";
import { canonicalProjectId, ensureLegacyProjectUuid } from "../../../lib/server/project-rekey";

export const dynamic = "force-dynamic";

/**
 * Lista los proyectos accesibles para la cuenta autenticada.
 * @returns Respuesta JSON con proyectos, rol y banderas de propietario/administrador.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const owner = await isOwner(user);
  if (owner) {
    try { await ensureLegacyProjectUuid(getD1()); }
    catch { return json({ message: "No se pudo actualizar el identificador del proyecto. Vuelve a intentarlo." }, 503); }
  }
  await getDb().update(userIdentities).set({ displayName: user.displayName }).where(eq(userIdentities.id, user.userId));
  const admin = !owner && await isAdministrator(user);
  if (owner || admin) {
    try { await cleanupOrphanUploads(); } catch { /* Se reintentará al volver a cargar proyectos. */ }
  }
  const all = await getDb().select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id));
  const legacyProjectId = await canonicalProjectId(getD1(), "default");
  if (owner || admin) return json({ projects: all.map((project) => ({ ...project, role: owner ? "owner" : "admin", studentSection: null, teacherId: null })), isOwner: owner, isAdmin: admin, legacyProjectId });
  const members = await getDb().select().from(projectMembers).where(eq(projectMembers.userId, user.userId));
  const visible = all.flatMap((project) => {
    const member = members.find((item) => item.projectId === project.id);
    return member?.status === "active" ? [{ ...project, role: member.role, studentSection: member.studentSection, teacherId: member.teacherId }] : [];
  });
  return json({ projects: visible, isOwner: false, legacyProjectId: visible.some((project) => project.id === legacyProjectId) ? legacyProjectId : null });
}

/**
 * Crea un proyecto nuevo (solo propietario o administrador).
 * @param request - Petición con identificador y nombre del proyecto.
 * @returns Respuesta JSON con el proyecto creado.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const result = await createProject(user, await request.json().catch(() => null));
  return result.ok ? json(result.proyecto, result.creado ? 201 : 200) : json({ message: result.message }, result.status);
}

/**
 * Elimina un proyecto con sus tareas, fichas, miembros e histórico.
 * @param request - Petición con el identificador del proyecto.
 * @returns Respuesta JSON con el identificador y si se borró.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const parsed = z.object({ id: z.string().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Proyecto no válido." }, 400);
  const result = await deleteProject(user, parsed.data.id);
  return result.ok ? json({ id: result.id, deleted: result.deleted }) : json({ message: result.message }, result.status);
}
