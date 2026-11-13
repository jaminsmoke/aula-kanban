import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { administrators, projectMembers, projects } from "../../db/schema";
import { isOwnerEmail } from "./project";

export type VpsPrincipal = { userId: string; email: string; projectId: string };

/**
 * Resolve current permissions for a principal supplied by the authenticated
 * gateway. This function is not an authentication mechanism: callers must
 * authenticate the gateway and validate the original Site-issued ticket first.
 * @param principal - Identity and project validated by the gateway.
 * @returns Current role or null.
 */
export async function currentVpsAccess(principal: VpsPrincipal) {
  const db = getDb();
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, principal.projectId));
  if (!project) return null;
  if (isOwnerEmail(principal.email)) return "owner" as const;
  const [admin] = await db.select({ id: administrators.id }).from(administrators).where(eq(administrators.userId, principal.userId));
  if (admin) return "admin" as const;
  const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(and(
    eq(projectMembers.projectId, principal.projectId), eq(projectMembers.userId, principal.userId), eq(projectMembers.status, "active"),
  ));
  if (!member || !["teacher", "student", "guest"].includes(member.role)) return null;
  return member.role as "teacher" | "student" | "guest";
}
