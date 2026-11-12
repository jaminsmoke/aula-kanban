import { env } from "cloudflare:workers";
import type { validProject } from "./project";

type Project = NonNullable<Awaited<ReturnType<typeof validProject>>>;
type ProfileInput = { name: string; role: string; activities: string; aiHelp: string };

// A unique mutation token makes the account change conditional on this exact optimistic update.
// D1 batch executes both statements transactionally, including uniqueness checks on the email.
export async function updateProfile(project: Project, kind: "student" | "teacher", id: string, revision: number, values: ProfileInput, accountEmail?: string) {
  const db = env.DB;
  if (!db) return { ok: false as const, status: 503, message: "Base de datos no disponible." };
  const student = kind === "student", table = student ? "students" : "teachers", idColumn = student ? "section" : "id", nameColumn = student ? "display_name" : "name", profileColumn = student ? "student_section" : "teacher_id";
  const access = project.access, user = access.user;
  const authSql = access.role === "owner" ? "1 = 1" : access.role === "admin" ? "EXISTS (SELECT 1 FROM administrators WHERE user_id = ?)" : "EXISTS (SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND role = ? AND status = 'active'" + ((access.role === "student" && student) ? " AND student_section = ?" : (access.role === "teacher" && !student) ? " AND teacher_id = ?" : "") + ")";
  const authArgs = access.role === "owner" ? [] : access.role === "admin" ? [user.userId] : [project.id, user.userId, access.role, ...((access.role === "student" && student) || (access.role === "teacher" && !student) ? [id] : [])];
  const token = crypto.randomUUID();
  const activeClause = student ? " AND deleted = 0" : "";
  const statements = [db.prepare(`UPDATE ${table} SET ${nameColumn} = ?, role = ?, activities = ?, ai_help = ?, revision = revision + 1, mutation_token = ? WHERE ${idColumn} = ? AND project_id = ? AND revision = ?${activeClause} AND ${authSql} RETURNING ${idColumn}`).bind(values.name, values.role, values.activities, values.aiHelp, token, id, project.id, revision, ...authArgs)];
  if (accountEmail !== undefined) {
    if (!accountEmail) {
      statements.push(db.prepare(`DELETE FROM project_members WHERE project_id = ? AND ${profileColumn} = ? AND EXISTS (SELECT 1 FROM ${table} WHERE ${idColumn} = ? AND project_id = ? AND mutation_token = ?)`).bind(project.id, id, id, project.id, token));
    } else {
      statements.push(db.prepare(`INSERT INTO project_members (id, project_id, email, role, ${profileColumn}, status) SELECT ?, ?, ?, ?, ?, 'pending' WHERE EXISTS (SELECT 1 FROM ${table} WHERE ${idColumn} = ? AND project_id = ? AND mutation_token = ?) ON CONFLICT(project_id, ${profileColumn}) DO UPDATE SET email = excluded.email, status = CASE WHEN project_members.email = excluded.email THEN project_members.status ELSE 'pending' END, user_id = CASE WHEN project_members.email = excluded.email THEN project_members.user_id ELSE NULL END`).bind(crypto.randomUUID(), project.id, accountEmail, kind, id, id, project.id, token));
    }
  }
  try {
    const result = await db.batch(statements);
    return result[0].results?.length ? { ok: true as const } : { ok: false as const, status: 409, message: "La ficha cambió o ya no tienes permiso. Actualiza y vuelve a intentarlo." };
  } catch {
    return { ok: false as const, status: 409, message: "No se guardaron los cambios. Comprueba que el correo no esté vinculado a otra ficha del proyecto." };
  }
}
