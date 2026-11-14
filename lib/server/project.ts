import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { administrators, projectMembers, projects } from "../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "./auth";
import { json } from "./http";
import { ensureInstanceOwner, isBootstrapOwnerEmail, isInstanceOwner, readInstanceOwner } from "./owner";

export const defaultProjectId = "default";
export type Access = { user: ChatGPTUser; role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null };
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectWithAccess = ProjectRow & { access: Access };
export type ProjectFailure = "unauthenticated" | "invalid" | "not_found" | "forbidden";
export type ProjectResolution =
  | { status: "ok"; project: ProjectWithAccess }
  | { status: ProjectFailure };

export const PROJECT_FAILURE_RESPONSES: Record<ProjectFailure, { status: number; message: string }> = {
  unauthenticated: { status: 401, message: "Inicia sesión para continuar." },
  invalid: { status: 400, message: "Proyecto no válido." },
  not_found: { status: 404, message: "No se encuentra el proyecto." },
  forbidden: { status: 403, message: "No tienes acceso a este proyecto." },
};

/**
 * Construye la respuesta HTTP común de un fallo al resolver el proyecto.
 * @param failure - Motivo tipado del fallo.
 * @returns Respuesta JSON con el estado y mensaje del contrato.
 */
export function projectFailureResponse(failure: ProjectFailure): Response {
  const response = PROJECT_FAILURE_RESPONSES[failure];
  return json({ message: response.message }, response.status);
}

/**
 * Indica si un correo es el configurado para el bootstrap del propietario.
 * @param email - Correo a comprobar (sin distinción de mayúsculas).
 * @returns `true` cuando coincide con `OWNER_EMAIL`.
 */
export function isOwnerEmail(email: string) {
  return isBootstrapOwnerEmail(email, env.OWNER_EMAIL);
}

/**
 * Indica si la cuenta autenticada es la propietaria de la instancia.
 * Persiste la identidad estable en el primer acceso si aún no existe.
 * @param user - Cuenta autenticada.
 * @returns `true` cuando el identificador estable coincide con el propietario.
 */
export async function isOwner(user: ChatGPTUser) {
  const db = env.DB;
  if (!db) return false;
  const owner = await ensureInstanceOwner(db, user, env.OWNER_EMAIL);
  return isInstanceOwner(owner, user);
}

/**
 * Indica si un correo pertenece al propietario persistido o al bootstrap.
 * @param email - Correo de contacto a comprobar.
 * @returns `true` cuando coincide con el propietario actual.
 */
export async function isOwnerContactEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = env.DB;
  if (db) {
    const owner = await readInstanceOwner(db);
    if (owner) return owner.email.trim().toLowerCase() === normalized;
  }
  return isOwnerEmail(email);
}

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
 * Resuelve el acceso de una cuenta concreta a un proyecto.
 * @param projectId - Identificador del proyecto.
 * @param user - Cuenta autenticada.
 * @returns El acceso con rol y ficha vinculada, o `null` sin acceso.
 */
export async function projectAccessForUser(projectId: string, user: ChatGPTUser): Promise<Access | null> {
  if (await isOwner(user)) return { user, role: "owner", studentSection: null, teacherId: null };
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
 * Resuelve el acceso de la cuenta autenticada a un proyecto.
 * @param projectId - Identificador del proyecto.
 * @returns El acceso con rol y ficha vinculada, o `null` sin acceso.
 */
export async function projectAccess(projectId: string): Promise<Access | null> {
  const user = await getChatGPTUser();
  return user ? projectAccessForUser(projectId, user) : null;
}

/**
 * Busca un proyecto por su identificador.
 * @param projectId - Identificador del proyecto.
 * @returns La fila del proyecto o `null`.
 */
export async function findProject(projectId: string): Promise<ProjectRow | null> {
  const [project] = await getDb().select().from(projects).where(eq(projects.id, projectId));
  return project ?? null;
}

type ProjectResolverDependencies = {
  getUser: () => Promise<ChatGPTUser | null>;
  findProject: (projectId: string) => Promise<ProjectRow | null>;
  accessForUser: (projectId: string, user: ChatGPTUser) => Promise<Access | null>;
};

/**
 * Resuelve el proyecto de la URL y el acceso de la cuenta con un resultado tipado.
 * @param request - Petición entrante con el parámetro `project`.
 * @param dependencies - Fuentes de usuario, proyecto y acceso; inyectables en tests.
 * @returns El proyecto con acceso o el motivo concreto del fallo.
 */
export async function resolveProject(request: Request, dependencies: ProjectResolverDependencies = {
  getUser: getChatGPTUser,
  findProject,
  accessForUser: projectAccessForUser,
}): Promise<ProjectResolution> {
  const user = await dependencies.getUser();
  if (!user) return { status: "unauthenticated" };
  const id = new URL(request.url).searchParams.get("project") || defaultProjectId;
  if (id.length > 80) return { status: "invalid" };
  const project = await dependencies.findProject(id);
  if (!project) return { status: "not_found" };
  const access = await dependencies.accessForUser(id, user);
  if (!access) return { status: "forbidden" };
  return { status: "ok", project: { ...project, access } };
}
