
import { z } from "zod";
import { getChatGPTUser } from "../../../lib/server/auth";
import { getDb } from "../../../db";
import { instanceApps } from "../../../db/schema";
import { isAdministrator, isOwner, projectFailureResponse, resolveProject } from "../../../lib/server/project";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";
import { isJsonRequest, isSameOrigin, json } from "../../../lib/server/http";

export const dynamic = "force-dynamic";
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
  if (!(await isOwner(user) || await isAdministrator(user))) return json({ message: "Solo el propietario o un administrador pueden gestionar aplicaciones." }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  const resolved = await resolveProject(request);
  if (resolved.status !== "ok") return projectFailureResponse(resolved.status);
  const installed = parsed.data.action === "install" ? 1 : 0;
  const now = Date.now();
  const values = { id: crypto.randomUUID(), appId: parsed.data.id, installed, version: null, installedByUserId: user.userId, updatedAt: now };
  await getDb().insert(instanceApps).values(values).onConflictDoUpdate({
    target: instanceApps.appId,
    set: { installed, version: null, installedByUserId: user.userId, updatedAt: now },
  });
  return json({ accepted: true }, 200);
}
