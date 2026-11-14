import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { administrators, projectMembers, projects } from "../../../db/schema";
import { getChatGPTUser } from "../../../lib/server/auth";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
/**
 * Lista las invitaciones pendientes para la cuenta autenticada.
 * Incluye invitaciones de proyecto y de administración del sitio.
 * @returns Respuesta JSON con las invitaciones pendientes.
 */
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión." }, 401);
  const db = getDb(), email = user.email.trim().toLowerCase();
  const [rows, adminInvitations] = await Promise.all([
    db.select({ id: projectMembers.id, projectId: projects.id, projectName: projects.name, role: projectMembers.role }).from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId)).where(and(eq(projectMembers.email, email), eq(projectMembers.status, "pending"))),
    db.select({ id: administrators.id }).from(administrators).where(and(eq(administrators.email, email), isNull(administrators.userId))),
  ]);
  return json([...rows.map(row => ({ ...row, scope: "project" })), ...adminInvitations.map(row => ({ id: row.id, projectId: null, projectName: "Administración de Aula Kanban", role: "admin", scope: "site" }))]);
}
/**
 * Acepta una invitación pendiente y activa el acceso de la cuenta.
 * @param request - Petición con el identificador y ámbito de la invitación.
 * @returns Respuesta JSON con el proyecto aceptado o el error.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser(); if (!user) return json({ message: "Inicia sesión." }, 401);
  const parsed = z.object({ id: z.string().uuid(), scope: z.enum(["project", "site"]).default("project") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Invitación no válida." }, 400);
  try {
    if (parsed.data.scope === "site") {
      const [row] = await getDb().update(administrators).set({ userId: user.userId }).where(and(eq(administrators.id, parsed.data.id), eq(administrators.email, user.email.trim().toLowerCase()), isNull(administrators.userId))).returning({ id: administrators.id });
      return row ? json({ projectId: null, scope: "site" }) : json({ message: "La invitación ya no está disponible para esta cuenta." }, 404);
    }
    const [row] = await getDb().update(projectMembers).set({ status: "active", userId: user.userId }).where(and(eq(projectMembers.id, parsed.data.id), eq(projectMembers.email, user.email.trim().toLowerCase()), eq(projectMembers.status, "pending"))).returning({ projectId: projectMembers.projectId });
    return row ? json({ ...row, scope: "project" }) : json({ message: "La invitación ya no está disponible para esta cuenta." }, 404);
  } catch { return json({ message: "No se pudo aceptar la invitación. Es posible que tu cuenta ya pertenezca al proyecto." }, 409); }
}
