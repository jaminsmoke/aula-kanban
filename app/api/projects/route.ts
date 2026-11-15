import { z } from "zod";
import { getChatGPTUser } from "../../../lib/server/auth";
import { projectFailureResponse } from "../../../lib/server/project-http";
import { createProject, deleteProject } from "../../../lib/server/projects";
import { json } from "../../../lib/server/http";
import { withJsonMutation } from "../../../lib/server/route-helpers";
import { loadProjectsOverview } from "../../../lib/server/project-overview";

export const dynamic = "force-dynamic";

/**
 * Lista los proyectos accesibles para la cuenta autenticada.
 * @returns Respuesta JSON con proyectos, rol y banderas de propietario/administrador.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const result = await loadProjectsOverview(user);
  return result.ok ? json(result.data) : json({ message: result.message }, result.status);
}

/** Crea un proyecto nuevo (solo propietario o administrador). */
export const POST = withJsonMutation(async (request) => {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const result = await createProject(user, await request.json().catch(() => null));
  return result.ok ? json(result.proyecto, result.creado ? 201 : 200) : json({ message: result.message }, result.status);
});

/** Elimina un proyecto con sus tareas, fichas, miembros e histórico. */
export const DELETE = withJsonMutation(async (request) => {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  const parsed = z.object({ id: z.string().min(1).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Proyecto no válido." }, 400);
  const result = await deleteProject(user, parsed.data.id);
  return result.ok ? json({ id: result.id, deleted: result.deleted }) : json({ message: result.message }, result.status);
});
