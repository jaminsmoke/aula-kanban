import { z } from "zod";
import { getChatGPTUser } from "../../../lib/server/access/auth";
import { tieneCapacidad } from "../../../lib/server/access/capabilities";
import { projectFailureResponse } from "../../../lib/server/projects/project-http";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";
import { listInstalledApps, setAppInstalled, MANAGE_APPS_FORBIDDEN } from "../../../lib/server/apps/apps";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";
const appId = z.enum(NATIVE_APP_IDS);
/**
 * Lee el estado de las aplicaciones nativas instaladas en la instancia.
 * @returns Una entrada por aplicación nativa (`installed` o `not_installed`).
 */
async function nativeApps() {
  return (await listInstalledApps()).map((item) => ({ id: item.id, status: item.status, url: null, version: item.version }));
}

/** Lista las aplicaciones nativas para miembros activos del proyecto. */
export const GET = withProjectRoute(async () => {
  try {
    return json({ apps: await nativeApps() });
  } catch {
    return json({ message: "No se pudo consultar las aplicaciones instaladas." }, 502);
  }
});

/** Instala o desinstala una aplicación nativa en toda la instancia. */
export const POST = withJsonMutation(async (request) => {
  const user = await getChatGPTUser();
  if (!user) return projectFailureResponse("unauthenticated");
  if (!(await tieneCapacidad(user, "instalar-app"))) return json({ message: MANAGE_APPS_FORBIDDEN }, 403);
  const parsed = z.object({ id: appId, action: z.enum(["install", "uninstall"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: "Aplicación o acción no válida." }, 400);
  const install = withProjectRoute(async () => {
    await setAppInstalled(user.userId, parsed.data.id, parsed.data.action === "install");
    return json({ accepted: true }, 200);
  });
  return install(request);
});
