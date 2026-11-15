import { isJsonRequest, isSameOrigin, json } from "./http";
import { projectFailureResponse } from "./project-http";
import { resolveProject, type ProjectWithAccess } from "./project-access";

type RouteHandler = (request: Request) => Promise<Response> | Response;
type ProjectHandler = (request: Request, project: ProjectWithAccess) => Promise<Response> | Response;

/**
 * Envuelve una mutación JSON con las guardas comunes de origen y formato.
 * @param handler - Lógica de la ruta, ya sin las guardas de transporte.
 * @returns Una función que aplica las guardas antes de delegar.
 */
export function withJsonMutation(handler: RouteHandler): RouteHandler {
  return async (request) => {
    if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
    if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
    return handler(request);
  };
}

/**
 * Resuelve el proyecto y el acceso antes de ejecutar una ruta de proyecto.
 * @param handler - Lógica de la ruta con el proyecto ya resuelto.
 * @returns Una función que responde el fallo común o delega en la ruta.
 */
export function withProjectRoute(handler: ProjectHandler): RouteHandler {
  return async (request) => {
    const resolved = await resolveProject(request);
    if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
    return handler(request, resolved.project);
  };
}
