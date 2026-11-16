import { asc, eq } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import { projectMembers, projects, userIdentities } from "../../db/schema";
import { DEMO_PROJECT_ID, isDemoUser } from "../domain/demo";
import type { ChatGPTUser } from "./auth";
import { isAdministrator, isOwner, type ProjectRow } from "./project-access";
import { canonicalProjectId, ensureLegacyProjectUuid } from "./project-rekey";
import { cleanupOrphanUploads } from "./storage";

/** Proyecto con el rol y la ficha que recibe la web. */
export type ProjectOverviewItem = ProjectRow & {
  role: string;
  studentSection: string | null;
  teacherId: string | null;
};

/** Datos de la pantalla de proyectos, ya preparados para serializar. */
export type ProjectsOverview = {
  projects: ProjectOverviewItem[];
  isOwner: boolean;
  isAdmin?: boolean;
  legacyProjectId: string | null;
};

/** Resultado del arranque y listado de proyectos. */
export type ProjectsOverviewResult =
  | { ok: true; data: ProjectsOverview }
  | { ok: false; status: number; message: string };

/**
 * Prepara el arranque idempotente de la instancia y lista los proyectos de
 * la cuenta. La migración solo la ejecuta el propietario; la limpieza de
 * subidas huérfanas es best-effort y no impide cargar la lista.
 * @param user - Cuenta autenticada.
 * @returns Los proyectos visibles con su rol, o el fallo de la migración.
 */
export async function loadProjectsOverview(user: ChatGPTUser): Promise<ProjectsOverviewResult> {
  if (isDemoUser(user)) {
    const [project] = await getDb().select().from(projects).where(eq(projects.id, DEMO_PROJECT_ID));
    return {
      ok: true,
      data: {
        projects: project
          ? [{ ...project, role: "guest", studentSection: null, teacherId: null }]
          : [],
        isOwner: false,
        isAdmin: false,
        legacyProjectId: null,
      },
    };
  }
  const owner = await isOwner(user);
  if (owner) {
    try {
      await ensureLegacyProjectUuid(getD1());
    } catch {
      return { ok: false, status: 503, message: "No se pudo actualizar el identificador del proyecto. Vuelve a intentarlo." };
    }
  }
  await getDb().update(userIdentities).set({ displayName: user.displayName }).where(eq(userIdentities.id, user.userId));
  const admin = !owner && await isAdministrator(user);
  if (owner || admin) {
    try { await cleanupOrphanUploads(); } catch { /* Se reintentará al volver a cargar proyectos. */ }
  }
  const all = await getDb().select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id));
  const legacyProjectId = await canonicalProjectId(getD1(), "default");
  if (owner || admin) {
    return {
      ok: true,
      data: {
        projects: all.map((project) => ({ ...project, role: owner ? "owner" : "admin", studentSection: null, teacherId: null })),
        isOwner: owner,
        isAdmin: admin,
        legacyProjectId,
      },
    };
  }
  const members = await getDb().select().from(projectMembers).where(eq(projectMembers.userId, user.userId));
  const visible = all.flatMap((project) => {
    const member = members.find((item) => item.projectId === project.id);
    return member?.status === "active" ? [{ ...project, role: member.role, studentSection: member.studentSection, teacherId: member.teacherId }] : [];
  });
  return {
    ok: true,
    data: {
      projects: visible,
      isOwner: false,
      legacyProjectId: visible.some((project) => project.id === legacyProjectId) ? legacyProjectId : null,
    },
  };
}
