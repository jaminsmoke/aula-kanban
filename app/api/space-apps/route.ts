
import { z } from "zod";
import { getChatGPTUser } from "../../../lib/server/auth";
import { isAdministrator, isOwner, projectFailureResponse, resolveProject } from "../../../lib/server/project-access";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";
import { listInstalledApps, setAppInstalled, MANAGE_APPS_FORBIDDEN } from "../../../lib/server/apps";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
const appId = z.enum(NATIVE_APP_IDS);
/**
 * Lee el estado de las aplicaciones nativas instaladas en la instancia.
 * @returns Una entrada por aplicación nativa (`installed` o `not_installed`).
 */
async function nativeApps() {
  return (await listInstalledApps()).map((item) => ({ id: item.id, status: item.status, url: null, version: item.version }));
}

/**
 * Lista las aplicaciones nativas para miembros activos del proyecto.
 * @param request - Petición con el proyecto activo.
 * @returns Lista de aplicaciones de la instancia.
 */
export async function GET(request: Request) {
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  try {
    return json({ apps: await nativeApps() });
  } catch {
    return json({ message: "No se pudo consultar las aplicaciones instaladas." }, 502);
  }
}

/**
 * Instala o desinstala una aplicación nativa en toda la instancia. Solo el
 * propietario o un administrador pueden gestionarla.
 * @param request - Petición con el identificador y la acción.
 * @returns Estado aceptado o error de autorización.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ message: "Solicitud no válida." }, 403);
  if (!isJsonRequest(request)) return json({ message: "Formato no válido." }, 415);
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  if (!(await isOwner(user) || await isAdministrator(user))) return json({ message: MANAGE_APPS_FORBIDDEN }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  await setAppInstalled(user.userId, parsed.data.id, parsed.data.action === "install");
  return json({ accepted: true }, 200);
}
