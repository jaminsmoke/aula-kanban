"use client";

import Whiteboard from "./whiteboard";
import type { SpaceRole } from "./tools";

/**
 * Ventana «Excalidraw»: la misma pizarra de las tareas (Excalidraw, MIT)
 * pero compartida por todo el proyecto, con sincronización en directo
 * (BoardRoom). El alumnado y los invitados la ven en solo lectura.
 * @param props - Proyecto activo y rol de la cuenta.
 * @returns La pizarra del proyecto rellenando la ventana del hub.
 */
export default function ExcalidrawApp({ projectId, role }: { projectId: string; role: SpaceRole }) {
  return (
    <div className="hub-board">
      <Whiteboard readOnly={role === "student" || role === "guest"} ownerType="project" ownerId={projectId} />
    </div>
  );
}
