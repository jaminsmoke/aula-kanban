import { getChatGPTUser } from "../../../../lib/server/auth";
import { isAdministrator, isOwner } from "../../../../lib/server/project-access";
import { json } from "../../../../lib/server/http";
import { storageStatus } from "../../../../lib/server/storage";

export const dynamic = "force-dynamic";

/**
 * Comprueba D1 y R2 para el propietario o la administración.
 * @returns El estado del almacenamiento, 401 sin sesión o 403 sin permiso.
 */
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para continuar." }, 401);
  if (!(await isOwner(user)) && !(await isAdministrator(user))) {
    return json({ message: "Solo el propietario o un administrador pueden consultar el almacenamiento." }, 403);
  }
  return json(await storageStatus());
}
