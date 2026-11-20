import { z } from "zod";
import { getChatGPTUser } from "../../../../lib/server/auth";
import { json, storageUnavailable } from "../../../../lib/server/http";
import { isAdministrator, isOwner } from "../../../../lib/server/project-access";
import { withJsonMutation } from "../../../../lib/server/route-helpers";
import { StorageUnavailableError } from "../../../../lib/server/storage/repository";
import { purgeAllUnusedUploads } from "../../../../lib/server/uploads/purge";

export const dynamic = "force-dynamic";

const body = z.object({
  simulacion: z.boolean().optional(),
  limite: z.number().int().min(1).max(100).optional(),
}).strict();

/**
 * Limpia archivos sin uso de todos los proyectos. La simulación es el modo
 * por defecto; solo el propietario o un administrador pueden ejecutarla.
 * @param request - Petición JSON con `simulacion` y `limite` opcionales.
 * @returns El resumen de la purga o el error correspondiente.
 */
export const POST = withJsonMutation(async (request) => {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para continuar." }, 401);
  if (!(await isOwner(user)) && !(await isAdministrator(user))) {
    return json({ message: "Solo el propietario o un administrador pueden limpiar archivos." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ message: "Solicitud no válida." }, 400);
  }
  const parsed = body.safeParse(payload);
  if (!parsed.success) return json({ message: "Solicitud no válida." }, 400);

  try {
    return json(await purgeAllUnusedUploads({
      simulate: parsed.data.simulacion ?? true,
      limit: parsed.data.limite,
    }));
  } catch (error) {
    if (error instanceof StorageUnavailableError) return storageUnavailable();
    return json({ message: "No se pudieron limpiar los archivos." }, 502);
  }
});
