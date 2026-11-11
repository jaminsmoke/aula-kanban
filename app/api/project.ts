import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { projectMembers, projects } from "../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

export const defaultProjectId = "default";
export type Access = { user: ChatGPTUser; role: "owner" | "teacher" | "student"; studentSection: string | null };

export function isOwner(user: ChatGPTUser) {
  const owner = env.OWNER_EMAIL || (import.meta.env.DEV ? "seedy@sites.test" : "");
  return Boolean(owner) && user.email.trim().toLowerCase() === owner.trim().toLowerCase();
}

export async function projectAccess(projectId: string): Promise<Access | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (isOwner(user)) return { user, role: "owner", studentSection: null };
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
