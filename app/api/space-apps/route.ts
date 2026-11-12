import { eq } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { spaceApps } from "../../../db/schema";
import { isAdministrator, isOwner, validProject } from "../../../lib/server/project";
import { callSpaceManager } from "../../../lib/server/space-manager";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const appId = z.enum(["nodum", "affine", "n8n", "excalidraw"]);
/** Aplicaciones nativas (librerías del propio Site): su estado vive en la DB. */
const NATIVE_APP_IDS = ["excalidraw"] as const;
// El gestor aún está en desarrollo; no se activa con secretos por accidente.
const VPS_MANAGER_ENABLED: boolean = false;
const item = z.object({ id: appId, status: z.enum(["installed", "stopped", "not_installed", "working", "error"]), url: z.string().url().nullable(), version: z.string().min(1).max(64).nullable() });

/**
 * Lee el estado de las aplicaciones nativas instaladas en el proyecto.
 * @param projectId - Identificador del proyecto.
 * @returns Una entrada por aplicación nativa (`installed` o `not_installed`).
 */
async function nativeApps(projectId: string) {
  const rows = await getDb().select().from(spaceApps).where(eq(spaceApps.projectId, projectId));
  return NATIVE_APP_IDS.map((id) => {
    const row = rows.find((item) => item.appId === id);
    return { id, status: row?.installed ? "installed" : "not_installed", url: null, version: row?.version ?? null };
  });
}

/**
 * Lista las aplicaciones del catálogo solo para miembros activos de algún
 * proyecto: las nativas desde la DB y las del VPS desde el gestor.
 * @param request - Petición con el proyecto activo.
 * @returns Estado del gestor del VPS y lista de aplicaciones.
 */
export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  let natives;
  try {
    natives = await nativeApps(project.id);
  } catch { return json({ message: "No se pudo consultar las aplicaciones instaladas." }, 502); }
  if (!VPS_MANAGER_ENABLED) return json({ configured: false, apps: natives });
  try {
    const result = await callSpaceManager("/v1/apps", "GET");
    if (result === null) return json({ configured: false, apps: natives });
    const parsed = z.object({ apps: z.array(item).max(3) }).safeParse(result);
    if (!parsed.success || parsed.data.apps.some(app => {
      if (!app.url) return false;
      const url = new URL(app.url);
      return url.protocol !== "https:" || Boolean(url.username || url.password || url.search || url.hash);
    })) throw new Error("invalid_response");
    return json({ configured: true, apps: [...parsed.data.apps, ...natives] });
  } catch { return json({ message: "No se pudo contactar con el gestor del VPS." }, 502); }
}

/**
 * Instala o desinstala una aplicación nativa (registro en la DB) o una del
 * VPS (vía el gestor, incluida el reseteo con borrado de datos).
 * @param request - Petición con el proyecto, identificador y acción.
 * @returns Estado aceptado o error de autorización.
 */
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !(isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden gestionar aplicaciones." }, 403);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ message: "Solicitud no válida." }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall", "reset"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  if ((NATIVE_APP_IDS as readonly string[]).includes(parsed.data.id)) {
    if (parsed.data.action === "reset") return json({ message: "Las aplicaciones nativas no admiten reseteo." }, 400);
    const installed = parsed.data.action === "install" ? 1 : 0;
    const now = Date.now();
    const values = { id: crypto.randomUUID(), projectId: project.id, appId: parsed.data.id, installed, version: null, installedByUserId: user.userId, updatedAt: now };
    await getDb().insert(spaceApps).values(values).onConflictDoUpdate({
      target: [spaceApps.projectId, spaceApps.appId],
      set: { installed, version: null, installedByUserId: user.userId, updatedAt: now },
    });
    return json({ accepted: true }, 200);
  }
  if (!VPS_MANAGER_ENABLED) return json({ message: "El gestor de aplicaciones VPS está en desarrollo." }, 503);
  try {
    const path = parsed.data.action === "reset" ? `/v1/apps/${parsed.data.id}/reset` : `/v1/apps/${parsed.data.id}`;
    const result = await callSpaceManager(path, parsed.data.action === "install" || parsed.data.action === "reset" ? "POST" : "DELETE");
    if (result === null) return json({ message: "El gestor del VPS no está configurado." }, 503);
    return json({ accepted: true }, 202);
  } catch { return json({ message: "No se pudo iniciar la operación en el VPS." }, 502); }
}
