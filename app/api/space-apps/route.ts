import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAdministrator, isOwner, validProject } from "../../../lib/server/project";
import { callSpaceManager } from "../../../lib/server/space-manager";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const appId = z.enum(["nodum", "affine"]);
// El gestor aún está en desarrollo; no se activa con secretos por accidente.
const VPS_MANAGER_ENABLED: boolean = false;
const item = z.object({ id: appId, status: z.enum(["installed", "stopped", "not_installed", "working", "error"]), url: z.string().url().nullable() });

/**
 * Lista las aplicaciones globales solo para miembros activos de algún proyecto.
 * @param request - Petición con el proyecto activo.
 * @returns Estado del gestor y lista de aplicaciones.
 */
export async function GET(request: Request) {
  if (!await validProject(request)) return json({ message: "No tienes acceso al proyecto." }, 403);
  if (!VPS_MANAGER_ENABLED) return json({ configured: false, apps: [] });
  try {
    const result = await callSpaceManager("/v1/apps", "GET");
    if (result === null) return json({ configured: false, apps: [] });
    const parsed = z.object({ apps: z.array(item).max(2) }).safeParse(result);
    if (!parsed.success || parsed.data.apps.some(app => {
      if (!app.url) return false;
      const url = new URL(app.url);
      return url.protocol !== "https:" || Boolean(url.username || url.password || url.search || url.hash);
    })) throw new Error("invalid_response");
    return json({ configured: true, apps: parsed.data.apps });
  } catch { return json({ message: "No se pudo contactar con el gestor del VPS." }, 502); }
}

/**
 * Instala o desinstala una aplicación del catálogo para toda la instancia.
 * @param request - Petición con identificador y acción.
 * @returns Estado aceptado o error de autorización.
 */
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !(isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden gestionar aplicaciones." }, 403);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ message: "Solicitud no válida." }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  if (!VPS_MANAGER_ENABLED) return json({ message: "El gestor de aplicaciones VPS está en desarrollo." }, 503);
  try {
    const result = await callSpaceManager(`/v1/apps/${parsed.data.id}`, parsed.data.action === "install" ? "POST" : "DELETE");
    if (result === null) return json({ message: "El gestor del VPS no está configurado." }, 503);
    return json({ accepted: true }, 202);
  } catch { return json({ message: "No se pudo iniciar la operación en el VPS." }, 502); }
}
