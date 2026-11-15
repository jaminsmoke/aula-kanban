import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { boards, taskAssignees, tasks } from "../../../db/schema";
import { projectFailureResponse, resolveProject, type Access } from "../../../lib/server/project-access";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const owner = z.object({ ownerType: z.enum(["task", "project", "space"]), ownerId: z.string().min(1).max(80) });
const payload = owner.extend({ snapshot: z.string().max(MAX_SNAPSHOT_BYTES), revision: z.number().int().nonnegative() });


/**
 * Indica si el dueño existe en este proyecto.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño (`task`, `project` o `space`).
 * @param ownerId - Identificador del dueño.
 * @returns `true` cuando el dueño existe y pertenece al proyecto.
 */
async function ownerExists(projectId: string, ownerType: string, ownerId: string) {
  if (ownerType === "task") {
    const [task] = await getDb().select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, ownerId), eq(tasks.projectId, projectId)));
    return Boolean(task);
  }
  return ownerId === projectId;
}

/**
 * Indica si la cuenta puede editar la pizarra del dueño indicado.
 * @param access - Acceso resuelto de la cuenta al proyecto.
 * @param projectId - Identificador del proyecto.
 * @param ownerType - Tipo de dueño (`task`, `project` o `space`).
 * @param ownerId - Identificador del dueño.
 * @returns `true` cuando puede editarla (el alumnado solo en sus tareas).
 */
async function canWrite(access: Access, projectId: string, ownerType: string, ownerId: string) {
  if (access.role === "guest") return false;
  if (access.role !== "student") return true;
  if (ownerType !== "task" || !access.studentSection) return false;
  const refs = await getDb().select().from(taskAssignees).where(and(eq(taskAssignees.projectId, projectId), eq(taskAssignees.taskId, ownerId)));
  return refs.length === 1 && refs[0].kind === "student" && refs[0].profileId === access.studentSection;
}

/**
 * Lee o guarda la pizarra de una tarea, del proyecto o del espacio de trabajo.
 * @param request - Petición con el proyecto y el dueño en la URL o el cuerpo JSON.
 * @returns Respuesta JSON con el snapshot de la pizarra o el error.
 */
async function handle(request: Request) {
  if (request.method !== "GET") {
    if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
    if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  }
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const project = resolved.project;
  const db = getDb();
  if (request.method === "GET") {
    const parsed = owner.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return json({ message: "La pizarra pedida no es válida." }, 400);
    if (!await ownerExists(project.id, parsed.data.ownerType, parsed.data.ownerId)) return json({ message: "No se encuentra el dueño de la pizarra." }, 404);
    const [board] = await db.select().from(boards).where(and(eq(boards.projectId, project.id), eq(boards.ownerType, parsed.data.ownerType), eq(boards.ownerId, parsed.data.ownerId)));
    return json(board ? { ownerType: board.ownerType, ownerId: board.ownerId, snapshot: board.snapshot, revision: board.revision, updatedAt: board.updatedAt } : { ownerType: parsed.data.ownerType, ownerId: parsed.data.ownerId, snapshot: "", revision: 0, updatedAt: 0 });
  }
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "La pizarra no es válida o supera los 2 MB." }, 400);
  if (!await ownerExists(project.id, parsed.data.ownerType, parsed.data.ownerId)) return json({ message: "No se encuentra el dueño de la pizarra." }, 404);
  if (!await canWrite(project.access, project.id, parsed.data.ownerType, parsed.data.ownerId)) return json({ message: "No puedes editar la pizarra de este elemento." }, 403);
  const now = Date.now();
  const [saved] = parsed.data.revision === 0
    ? await db.insert(boards).values({
        id: crypto.randomUUID(), projectId: project.id,
        ownerType: parsed.data.ownerType, ownerId: parsed.data.ownerId,
        snapshot: parsed.data.snapshot, revision: 1, updatedAt: now,
      }).onConflictDoNothing().returning()
    : await db.update(boards).set({
        snapshot: parsed.data.snapshot, revision: sql`${boards.revision} + 1`, updatedAt: now,
      }).where(and(eq(boards.projectId, project.id), eq(boards.ownerType, parsed.data.ownerType),
        eq(boards.ownerId, parsed.data.ownerId), eq(boards.revision, parsed.data.revision))).returning();
  return saved ? json(saved, 201) : json({ message: "La pizarra cambió en otra sesión. Actualiza antes de guardar.", conflict: true }, 409);
}
export { handle as GET, handle as PUT };
