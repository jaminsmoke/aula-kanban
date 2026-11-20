import { env } from "cloudflare:workers";
import { getD1 } from "../../../db";
import { DEMO_PROJECT_ID, isDemoUser } from "../../domain/demo";
import { getChatGPTUser, type ChatGPTUser } from "../access/auth";
import { ensureInstanceOwner, isBootstrapOwnerEmail, isInstanceOwner, readInstanceOwner } from "../access/owner";
import {
  findActiveMemberRow,
  findAdministratorRowByUser,
  findProjectAccessRow,
  updateAdministratorEmailRow,
  updateMemberEmailRow,
} from "./access-repository";
import { canonicalProjectId } from "./project-rekey";

/**
 * Autorización de proyectos: propiedad de la instancia, rol global, acceso
 * por membresía y resolución tipada del proyecto de la URL.
 *
 * El acceso D1 vive en `access-repository.ts`; aquí se conservan las reglas
 * y los tipos que consumen rutas, MCP y servicios.
 */

export const defaultProjectId = "default";
export type Access = { user: ChatGPTUser; role: "owner" | "admin" | "teacher" | "student" | "guest"; studentSection: string | null; teacherId: string | null };
export type ProjectRow = import("./access-repository").ProjectAccessRow;
export type ProjectWithAccess = ProjectRow & { access: Access };
export type ProjectFailure = "unauthenticated" | "invalid" | "not_found" | "forbidden";
export type ProjectResolution =
  | { status: "ok"; project: ProjectWithAccess }
  | { status: ProjectFailure };

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
  // La demo nunca es propietaria ni debe reclamar la instancia.
  if (isDemoUser(user)) return false;
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
  if (isDemoUser(user)) return false;
  const email = user.email.trim().toLowerCase();
  try {
    const linked = await findAdministratorRowByUser(user.userId);
    if (linked) {
      if (linked.email !== email) {
        // The stable Site identity wins over a changed contact email. A conflict does not grant the email's other account access.
        try { await updateAdministratorEmailRow(linked.id, user.userId, email); } catch { /* keep the existing contact until the conflict is resolved */ }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Rol global de la cuenta en la instancia, sin proyecto concreto.
 * Dirime una sola vez por petición cuando se listan muchos proyectos.
 * @param user - Cuenta autenticada.
 * @returns `owner`, `admin` o `null` si la cuenta no tiene rol global.
 */
export async function globalRoleForUser(user: ChatGPTUser): Promise<"owner" | "admin" | null> {
  if (await isOwner(user)) return "owner";
  if (await isAdministrator(user)) return "admin";
  return null;
}

/**
 * Acceso por membresía de la cuenta a un proyecto, sin el rol global.
 * @param projectId - Identificador del proyecto.
 * @param user - Cuenta autenticada.
 * @returns El acceso con rol de miembro y ficha vinculada, o `null` sin acceso.
 */
export async function memberAccess(projectId: string, user: ChatGPTUser): Promise<Access | null> {
  const member = await findActiveMemberRow(projectId, user.userId);
  if (!member || (member.role !== "teacher" && member.role !== "student" && member.role !== "guest")) return null;
  const currentEmail = user.email.trim().toLowerCase();
  if (member.email !== currentEmail) {
    try { await updateMemberEmailRow(member.id, user.userId, currentEmail); } catch { /* retain the previous contact if another membership uses this email */ }
  }
  return { user, role: member.role, studentSection: member.studentSection, teacherId: member.teacherId };
}

/**
 * Resuelve el acceso de una cuenta concreta a un proyecto.
 * @param projectId - Identificador del proyecto.
 * @param user - Cuenta autenticada.
 * @returns El acceso con rol y ficha vinculada, o `null` sin acceso.
 */
export async function projectAccessForUser(projectId: string, user: ChatGPTUser): Promise<Access | null> {
  // La demo es siempre invitada de un único proyecto ficticio.
  if (isDemoUser(user)) {
    return projectId === DEMO_PROJECT_ID
      ? { user, role: "guest", studentSection: null, teacherId: null }
      : null;
  }
  const globalRole = await globalRoleForUser(user);
  if (globalRole) return { user, role: globalRole, studentSection: null, teacherId: null };
  return memberAccess(projectId, user);
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
  const canonical = projectId === "default" ? (await canonicalProjectId(getD1(), projectId)) ?? projectId : projectId;
  return findProjectAccessRow(canonical);
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
  const access = await dependencies.accessForUser(project.id, user);
  if (!access) return { status: "forbidden" };
  return { status: "ok", project: { ...project, access } };
}
