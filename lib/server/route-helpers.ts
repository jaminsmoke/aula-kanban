import { isJsonRequest, isSameOrigin, json } from "./http";
import { projectFailureResponse } from "./project-http";
import { resolveProject, type ProjectWithAccess } from "./project-access";

type RouteHandler = (request: Request) => Promise<Response> | Response;
type ProjectHandler = (request: Request, project: ProjectWithAccess) => Promise<Response> | Response;
type RouteHandlerWithContext<Context> = (request: Request, context: Context) => Promise<Response> | Response;
type ProjectHandlerWithContext<Context> = (request: Request, project: ProjectWithAccess, context: Context) => Promise<Response> | Response;

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
export function withProjectRoute(handler: ProjectHandler): RouteHandler;
export function withProjectRoute<Context>(handler: ProjectHandlerWithContext<Context>): RouteHandlerWithContext<Context>;
export function withProjectRoute(
  handler: ProjectHandler | ProjectHandlerWithContext<unknown>,
): (request: Request, context?: unknown) => Promise<Response> {
  return async (request, context) => {
    const resolved = await resolveProject(request);
    if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
    return (handler as ProjectHandlerWithContext<unknown>)(request, resolved.project, context);
  };
}

/**
 * Ejecuta una ruta con el proyecto al que pertenece un recurso guardado.
 *
 * La descarga de un archivo o de una copia portable no lleva `?project` en la
 * URL: el ámbito de autorización es el del propio objeto, no el de la petición
 * entrante. Se construye una petición interna con ese proyecto para reutilizar
 * las mismas guardas que el resto de rutas.
 * @param projectId - Proyecto dueño del recurso.
 * @param handler - Lógica de la ruta con el proyecto ya resuelto.
 * @returns La respuesta de la ruta o el fallo común de acceso.
 */
export async function withResourceProject(projectId: string, handler: ProjectHandler): Promise<Response> {
  return withProjectRoute(handler)(new Request(`http://local/?project=${encodeURIComponent(projectId)}`));
}
