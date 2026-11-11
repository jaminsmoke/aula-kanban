import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { projects } from "../../db/schema";

export const defaultProjectId = "default";
export async function ensureDefaultProject() {
  await getDb().insert(projects).values({ id: defaultProjectId, name: "Curso IA Gestorex", createdAt: 0 }).onConflictDoNothing();
}
export async function validProject(request: Request) {
  const id = new URL(request.url).searchParams.get("project") || defaultProjectId;
  if (id.length > 80) return null;
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id));
  if (project) return project;
  if (id !== defaultProjectId) return null;
  await ensureDefaultProject();
  const [created] = await getDb().select().from(projects).where(eq(projects.id, id));
  return created ?? null;
}
