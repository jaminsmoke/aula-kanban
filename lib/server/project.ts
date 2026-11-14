import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { administrators, projectMembers, projects } from "../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "./auth";

export const defaultProjectId = "default";
export type Access = { user: ChatGPTUser; role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null };

/**
 * Indica si un correo es el del propietario de la instancia.
 * @param email - Correo a comprobar (sin distinción de mayúsculas).
 * @returns `true` cuando coincide con `OWNER_EMAIL`.
 */
export function isOwnerEmail(email: string) {
  const owner = env.OWNER_EMAIL || (import.meta.env.DEV ? "seedy@sites.test" : "");
  return Boolean(owner) && email.trim().toLowerCase() === owner.trim().toLowerCase();
}
/**
 * Indica si la cuenta autenticada es la propietaria de la instancia.
 * @param user - Cuenta autenticada.
 * @returns `true` cuando su correo es el del propietario.
 */
export function isOwner(user: ChatGPTUser) { return isOwnerEmail(user.email); }

/**
 * Indica si la cuenta está vinculada a una ficha de administrador.
 * Sincroniza el correo guardado con el de la cuenta si ha cambiado.
 * @param user - Cuenta autenticada.
 * @returns `true` cuando existe una ficha de administrador vinculada.
 */
export async function isAdministrator(user: ChatGPTUser) {
  const db = getDb();
  const email = user.email.trim().toLowerCase();
  try {
    const [linked] = await db.select().from(administrators).where(eq(administrators.userId, user.userId));
    if (linked) {
      if (linked.email !== email) {
        // The stable Site identity wins over a changed contact email. A conflict does not grant the email's other account access.
        try { await db.update(administrators).set({ email }).where(and(eq(administrators.id, linked.id), eq(administrators.userId, user.userId))); } catch { /* keep the existing contact until the conflict is resolved */ }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Resuelve el acceso de la cuenta autenticada a un proyecto.
 * @param projectId - Identificador del proyecto.
 * @returns El acceso con rol y ficha vinculada, o `null` sin acceso.
 */
export async function projectAccess(projectId: string): Promise<Access | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (isOwner(user)) return { user, role: "owner", studentSection: null, teacherId: null };
  if (await isAdministrator(user)) return { user, role: "admin", studentSection: null, teacherId: null };
  const [member] = await getDb().select().from(projectMembers).where(and(
    eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.userId), eq(projectMembers.status, "active"),
  ));
  if (!member || (member.role !== "teacher" && member.role !== "student" && member.role !== "guest")) return null;
  const currentEmail = user.email.trim().toLowerCase();
  if (member.email !== currentEmail) {
    try { await getDb().update(projectMembers).set({ email: currentEmail }).where(and(eq(projectMembers.id, member.id), eq(projectMembers.userId, user.userId), eq(projectMembers.status, "active"))); } catch { /* retain the previous contact if another membership uses this email */ }
  }
  return { user, role: member.role, studentSection: member.studentSection, teacherId: member.teacherId };
}

/**
 * Valida el proyecto pedido en la URL y el acceso de la cuenta a él.
 * @param request - Petición entrante con el parámetro `project`.
 * @returns El proyecto con su acceso, o `null` si no existe o no hay acceso.
 */
export async function validProject(request: Request) {
  const id = new URL(request.url).searchParams.get("project") || defaultProjectId;
  if (id.length > 80) return null;
  const access = await projectAccess(id);
  if (!access) return null;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id));
  return project ? { ...project, access } : null;
}
