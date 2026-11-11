import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../db";
import { administrators, projectMembers, projects } from "../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export const defaultProjectId = "default";
export type Access = { user: ChatGPTUser; role: "owner" | "admin" | "teacher" | "student"; studentSection: string | null };

export function isOwner(user: ChatGPTUser) {
  const owner = env.OWNER_EMAIL || (import.meta.env.DEV ? "seedy@sites.test" : "");
  return Boolean(owner) && user.email.trim().toLowerCase() === owner.trim().toLowerCase();
}

export async function isAdministrator(user: ChatGPTUser) {
  const db = getDb();
  const email = user.email.trim().toLowerCase();
  try {
    await db.update(administrators).set({ userId: user.userId }).where(and(eq(administrators.email, email), isNull(administrators.userId)));
    const [admin] = await db.select().from(administrators).where(and(eq(administrators.email, email), eq(administrators.userId, user.userId)));
    return Boolean(admin);
  } catch {
    return false;
  }
}

export async function projectAccess(projectId: string): Promise<Access | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (isOwner(user)) return { user, role: "owner", studentSection: null };
  if (await isAdministrator(user)) return { user, role: "admin", studentSection: null };
  const [member] = await getDb().select().from(projectMembers).where(and(
    eq(projectMembers.projectId, projectId), eq(projectMembers.email, user.email.trim().toLowerCase()),
  ));
  if (!member || (member.role !== "teacher" && member.role !== "student")) return null;
  return { user, role: member.role, studentSection: member.studentSection };
}

export async function validProject(request: Request) {
  const id = new URL(request.url).searchParams.get("project") || defaultProjectId;
  if (id.length > 80) return null;
  const access = await projectAccess(id);
  if (!access) return null;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id));
  return project ? { ...project, access } : null;
}
