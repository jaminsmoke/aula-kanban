import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../../db";
import { tasks as taskRows } from "../../../../../db/schema";
import { taskAuthGuard } from "../../../tasks/permissions";
import { decorate, projectData } from "../../../tasks/queries";
import type { ProjectData, TaskRef, TaskRow } from "../../../tasks/types";
import type { Access } from "../../../projects/project-access";
import { errorHerramienta, falloResolucion, resolve, toChatGPTUser, CODIGO_ESTADO, type McpCaller } from "../../contexto";

/**
 * Schemas y helpers compartidos por las herramientas de tareas.
 */

export const projectId = z.string().uuid().describe("Id del proyecto de Aula Kanban");
export const taskId = z.string().uuid().describe("Id de la tarea");
export const person = z.object({
  kind: z.enum(["student", "teacher"]).describe("Tipo de perfil responsable"),
  profileId: z.string().min(1).max(80).describe("Id del perfil (sección de alumno o de profesor)"),
});
export const revision = z.number().int().positive().optional().describe("Revisión conocida de la tarea; si se omite se usa la actual");
/** La misma validación que `/api/tasks`: URL http(s) o archivo del proyecto. */
export const imagenUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value) || /^\/api\/files\/[A-Za-z0-9-]+$/.test(value), "URL de imagen no válida")
  .optional();

export const GUEST_ERROR = "Las cuentas invitadas solo pueden consultar el proyecto.";

/** Herramienta y proyecto con el acceso de la cuenta ya comprobado. */
type EditorContext = { access: Access; data: ProjectData };

/** Tarea decorada tal como la devuelve la API. */
export type DecoratedTask = ReturnType<typeof decorate>;

/**
 * Tareas decoradas de un proyecto, tal como las devuelve la API.
 * @param projectId - Identificador del proyecto.
 * @returns Los datos del proyecto y sus tareas decoradas.
 */
export async function decoratedTasks(projectId: string): Promise<{ data: ProjectData; tasks: DecoratedTask[] }> {
  const db = getDb();
  const [data, rows] = await Promise.all([
    projectData(projectId),
    db.select().from(taskRows).where(eq(taskRows.projectId, projectId)).orderBy(asc(taskRows.createdAt)),
  ]);
  return { data, tasks: rows.map((row) => decorate(row, data)) };
}

/**
 * Resuelve el proyecto y comprueba que la cuenta puede escribir en él.
 * @param caller - Cuenta identificada por el token.
 * @param projectId - Identificador del proyecto.
 * @returns El contexto de escritura o el error del contrato.
 */
export async function editorContext(caller: McpCaller, projectId: string) {
  const resolved = await resolve(toChatGPTUser(caller), projectId);
  if (!resolved.ok) return { ok: false as const, error: falloResolucion(resolved) };
  if (resolved.access.role === "guest") return { ok: false as const, error: errorHerramienta("forbidden", GUEST_ERROR) };
  return { ok: true as const, context: { access: resolved.access, data: await projectData(projectId) } as EditorContext };
}

/**
 * Busca la tarea actual de cualquier rol con la guarda de autorización,
 * como hace la ruta HTTP antes de mutar.
 * @param caller - Cuenta identificada por el token.
 * @param access - Acceso de la cuenta al proyecto.
 * @param projectId - Identificador del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns La fila actual o `null` si no existe o no la ve la cuenta.
 */
export async function findCurrentTask(caller: McpCaller, access: Access, projectId: string, taskId: string): Promise<TaskRow | null> {
  const db = getDb();
  const auth = taskAuthGuard(access.role, caller.userId, projectId);
  const [current] = await db.select().from(taskRows).where(and(eq(taskRows.id, taskId), eq(taskRows.projectId, projectId), auth.guard));
  return current ?? null;
}

/**
 * Referencias actuales de una tarea, tal como las agrupa la ruta HTTP.
 * @param data - Datos del proyecto.
 * @param taskId - Identificador de la tarea.
 * @returns Referencias vigentes de la tarea.
 */
export function currentRefs(data: ProjectData, taskId: string): TaskRef[] {
  return data.refs
    .filter((ref) => ref.taskId === taskId && (ref.kind === "student" || ref.kind === "teacher"))
    .map((ref) => ({ kind: ref.kind as TaskRef["kind"], profileId: ref.profileId }));
}

/**
 * Traduce el fallo de una mutación al contrato MCP por su estado HTTP.
 * @param failure - Fallo con estado y mensaje de la mutación.
 * @param revisionActual - Revisión vigente de la tarea, si se conoce (para `conflict`).
 * @returns El resultado de error.
 */
export function falloMutacion(failure: { status: number; message: string }, revisionActual?: number) {
  const codigo = (Object.entries(CODIGO_ESTADO).find(([, estado]) => estado === failure.status)?.[0] ?? "error") as Parameters<typeof errorHerramienta>[0];
  return errorHerramienta(codigo, failure.message, revisionActual !== undefined ? { revisionActual } : undefined);
}
