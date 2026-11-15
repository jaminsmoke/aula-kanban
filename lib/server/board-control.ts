import { env } from "cloudflare:workers";
import { MAX_BOARD_LIVE_BYTES } from "../domain/boards/excalidraw-elements";
import type { BoardOwnerType } from "./boards";
import type { BoardRoom } from "./board-room";

/**
 * Publica una escena ya guardada en la sala de su pizarra. Sin binding, sin
 * pestañas o con una escena mayor de 1 MB devuelve `false`; nunca falla el
 * guardado por un problema del canal en vivo.
 * @param projectId - Proyecto de la pizarra.
 * @param ownerType - Tipo de dueño de la pizarra.
 * @param ownerId - Tarea, proyecto o espacio dueño.
 * @param snapshot - Snapshot que ya está en D1.
 * @param revision - Revisión guardada.
 * @returns `true` si al menos una pestaña recibió la escena.
 */
export async function publicarEscena(
  projectId: string,
  ownerType: BoardOwnerType,
  ownerId: string,
  snapshot: string,
  revision: number,
): Promise<boolean> {
  if (snapshot.length > MAX_BOARD_LIVE_BYTES) return false;
  const rooms = env.BOARD_ROOMS;
  if (!rooms) return false;
  try {
    const stub = rooms.getByName(`${projectId}:${ownerType}:${ownerId}`) as DurableObjectStub<BoardRoom>;
    return await stub.publicarEscena(snapshot, revision);
  } catch {
    return false;
  }
}
