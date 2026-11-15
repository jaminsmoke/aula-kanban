"use client";

import Whiteboard from "../../shared/whiteboard";
import type { StoreRole } from "../types";

/**
 * Ventana «Excalidraw» de «Tienda»: la pizarra del espacio de trabajo
 * (`ownerType: "space"`), distinta de la pizarra compartida del proyecto y
 * de las pizarras de las tareas, con sincronización en directo (BoardRoom).
 * El alumnado y los invitados la ven en solo lectura.
 * @param props - Proyecto activo y rol de la cuenta.
 * @returns La pizarra del espacio rellenando la ventana del hub.
 */
export default function ExcalidrawApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  return (
    <div className="hub-board">
      <Whiteboard readOnly={role === "student" || role === "guest"} ownerType="space" ownerId={projectId} />
    </div>
  );
}
