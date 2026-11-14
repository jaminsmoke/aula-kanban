
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { instanceApps } from "../../../db/schema";
import { isAdministrator, isOwner, validProject } from "../../../lib/server/project";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const appId = z.enum(NATIVE_APP_IDS);
/**
 * Lee el estado de las aplicaciones nativas instaladas en la instancia.
 * @returns Una entrada por aplicación nativa (`installed` o `not_installed`).
 */
async function nativeApps() {
  const rows = await getDb().select().from(instanceApps);
  return NATIVE_APP_IDS.map((id) => {
    const row = rows.find((item) => item.appId === id);
    return { id, status: row?.installed ? "installed" : "not_installed", url: null, version: row?.version ?? null };
  });
}

/**
 * Lista las aplicaciones nativas para miembros activos del proyecto.
 * @param request - Petición con el proyecto activo.
 * @returns Lista de aplicaciones de la instancia.
 */
export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
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
  const user = await getChatGPTUser();
  if (!user || !(isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden gestionar aplicaciones." }, 403);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ message: "Solicitud no válida." }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  const installed = parsed.data.action === "install" ? 1 : 0;
  const now = Date.now();
  const values = { id: crypto.randomUUID(), appId: parsed.data.id, installed, version: null, installedByUserId: user.userId, updatedAt: now };
  await getDb().insert(instanceApps).values(values).onConflictDoUpdate({
    target: instanceApps.appId,
    set: { installed, version: null, installedByUserId: user.userId, updatedAt: now },
  });
  return json({ accepted: true }, 200);
}
