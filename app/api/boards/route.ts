import { z } from "zod";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";
import {
  BOARD_INVALID,
  BOARD_OWNER_TYPES,
  MAX_BOARD_SNAPSHOT_BYTES,
  readBoard,
  saveBoard,
} from "../../../lib/server/board/boards";

export const dynamic = "force-dynamic";

const owner = z.object({
  ownerType: z.enum(BOARD_OWNER_TYPES),
  ownerId: z.string().min(1).max(80),
});
const payload = owner.extend({
  snapshot: z.string().max(MAX_BOARD_SNAPSHOT_BYTES),
  revision: z.number().int().nonnegative(),
});

/**
 * Traduce el fallo del servicio al cuerpo HTTP existente.
 * @param result - Fallo de dueño, permiso, tamaño o conflicto.
 * @returns La respuesta con el estado equivalente.
 */
function boardFailure(result: { status: 400 | 403 | 404 | 409; message: string }) {
  return json(result.status === 409 ? { message: result.message, conflict: true } : { message: result.message }, result.status);
}

const getBoard = withProjectRoute(async (request, project) => {
  const parsed = owner.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return json({ message: "La pizarra pedida no es válida." }, 400);
  const result = await readBoard(project.id, parsed.data.ownerType, parsed.data.ownerId);
  return result.ok ? json(result.value) : boardFailure(result);
});

const saveBoardRoute = withJsonMutation(withProjectRoute(async (request, project) => {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ message: BOARD_INVALID }, 400);
  const result = await saveBoard({
    projectId: project.id,
    access: project.access,
    ownerType: parsed.data.ownerType,
    ownerId: parsed.data.ownerId,
    snapshot: parsed.data.snapshot,
    revision: parsed.data.revision,
  });
  return result.ok ? json(result.value, 201) : boardFailure(result);
}));

export { getBoard as GET, saveBoardRoute as PUT };
