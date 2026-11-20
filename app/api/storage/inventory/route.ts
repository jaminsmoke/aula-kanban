import { getChatGPTUser } from "../../../../lib/server/auth";
import { json, storageUnavailable } from "../../../../lib/server/http";
import { isAdministrator, isOwner } from "../../../../lib/server/project-access";
import { MAX_BUCKET_PAGE, StorageUnavailableError } from "../../../../lib/server/storage/repository";
import { auditInventoryPage } from "../../../../lib/server/uploads/inventory";

export const dynamic = "force-dynamic";

/** Longitud máxima aceptada para el cursor opaco de R2. */
const MAX_CURSOR_LENGTH = 8192;

/**
 * Revisa una página del inventario de R2 y la coteja con `uploads`.
 * Solo lectura: no borra objetos ni metadatos.
 * @param request - Petición con `cursor` y `limit` opcionales.
 * @returns La página clasificada o el error correspondiente.
 */
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para continuar." }, 401);
  if (!(await isOwner(user)) && !(await isAdministrator(user))) {
    return json({ message: "Solo el propietario o un administrador pueden revisar el almacenamiento." }, 403);
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && (!cursor || cursor.length > MAX_CURSOR_LENGTH)) {
    return json({ message: "Solicitud no válida." }, 400);
  }
  const rawLimit = url.searchParams.get("limit");
  let limit: number | undefined;
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BUCKET_PAGE) {
      return json({ message: "Solicitud no válida." }, 400);
    }
  }

  try {
    return json(await auditInventoryPage({ cursor, limit }));
  } catch (error) {
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    return json({ message: "No se pudo revisar el almacenamiento." }, 502);
  }
}
