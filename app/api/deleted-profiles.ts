import { env } from "cloudflare:workers";

export const DELETED_PROFILE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Once a deleted profile is purged, its authored tasks keep this credit instead of a name.
export const OWNER_CREDIT = "Propietario del aula";
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const lastCheck = new Map<string, number>();

type Expired = { id: string; userId: string | null };

async function expired(projectId: string, table: "deleted_students" | "deleted_teachers", column: "section" | "id", cutoff: number) {
  const result = await env.DB!.prepare(`SELECT ${column} AS id, user_id AS userId FROM ${table} WHERE project_id = ? AND deleted_at < ?`)
    .bind(projectId, cutoff).all<Expired>();
  return result.results ?? [];
}

/**
 * Purges profiles deleted more than 30 days ago. Their assignments are removed so the tasks become
 * unassigned, and the tasks they authored are credited to the owner of the instance.
 * Runs at most once per hour per project, so it can be called from any read route.
 */
export async function purgeDeletedProfiles(projectId: string) {
  const binding = env.DB;
  if (!binding) return;
  const now = Date.now();
  if (now - (lastCheck.get(projectId) ?? 0) < CHECK_INTERVAL_MS) return;
  lastCheck.set(projectId, now);
  const cutoff = now - DELETED_PROFILE_TTL_MS;
  const [students, teachers] = await Promise.all([
    expired(projectId, "deleted_students", "section", cutoff),
    expired(projectId, "deleted_teachers", "id", cutoff),
  ]);
  if (!students.length && !teachers.length) return;
  const statements: D1PreparedStatement[] = [];
  const expire = (kind: "student" | "teacher", table: "deleted_students" | "deleted_teachers", column: "section" | "id", row: Expired) => {
    // A person may have been invited again during the retention period. In that case
    // their active identity still owns their authored tasks in this project.
    if (row.userId) statements.push(binding.prepare("UPDATE tasks SET creator_user_id = NULL, creator_member_id = NULL, creator_name = ? WHERE project_id = ? AND creator_user_id = ? AND NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND status = 'active')").bind(OWNER_CREDIT, projectId, row.userId, projectId, row.userId));
    statements.push(binding.prepare("DELETE FROM task_assignees WHERE project_id = ? AND kind = ? AND profile_id = ?").bind(projectId, kind, row.id));
    statements.push(binding.prepare(`DELETE FROM ${table} WHERE project_id = ? AND ${column} = ? AND deleted_at < ?`).bind(projectId, row.id, cutoff));
    if (row.userId) statements.push(binding.prepare("DELETE FROM user_identities WHERE id = ? AND NOT EXISTS (SELECT 1 FROM tasks WHERE creator_user_id = ?) AND NOT EXISTS (SELECT 1 FROM project_members WHERE user_id = ?)").bind(row.userId, row.userId, row.userId));
  };
  students.forEach(row => expire("student", "deleted_students", "section", row));
  teachers.forEach(row => expire("teacher", "deleted_teachers", "id", row));
  try { await binding.batch(statements); } catch { /* the next check retries the purge */ }
}
