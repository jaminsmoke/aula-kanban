import { json } from "../../../lib/server/http";
import { projectFailureResponse, resolveProject } from "../../../lib/server/project-access";
import { listStudents, mutateStudent } from "../../../lib/server/people/students";

export const dynamic = "force-dynamic";

/**
 * Lista las fichas de alumnos activas del proyecto con su estado de cuenta.
 * @param request - Petición con el proyecto en la URL.
 * @returns Respuesta JSON con las fichas sin el token de mutación.
 */
export async function GET(request: Request) {
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  return json(await listStudents(resolved.project.id, resolved.project.access));
}

export { mutateStudent as POST, mutateStudent as PATCH, mutateStudent as DELETE };
