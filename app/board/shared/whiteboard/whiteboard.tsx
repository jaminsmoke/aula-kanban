"use client";

import { useWhiteboard } from "./use-whiteboard";
import WhiteboardCanvas from "./whiteboard-canvas";
import "./whiteboard.css";

/**
 * Pizarra con Excalidraw, persistida en la API del tablero. En las tareas
 * (`ownerType: "task"`, por defecto) el dueño es la tarea; en el hub
 * (`ownerType: "project"`, con `ownerId` igual al proyecto) es la pizarra
 * compartida del proyecto, y (`ownerType: "space"`, también con `ownerId`
 * igual al proyecto) es la pizarra del espacio de trabajo de «Mi espacio».
 * @param props - Tarea dueña, tipo de dueño, identificador del dueño y bandera de solo lectura.
 * @returns La pizarra con sus estados de carga y error.
 */
export default function Whiteboard({ taskId, readOnly, ownerType = "task", ownerId }: { taskId?: string; readOnly: boolean; ownerType?: "task" | "project" | "space"; ownerId?: string }) {
  const boardId = ownerId ?? taskId ?? "";
  const { initial, error, status, retry, setApi, handleChange, handlePointer } = useWhiteboard({ boardId, ownerType, readOnly });

  if (error) {
    return (
      <div className="board-error" role="alert">
        <p>{error}</p>
        <button type="button" className="secondary" onClick={retry}>Reintentar</button>
      </div>
    );
  }
  if (!initial) return <p className="board-loading" role="status">Cargando la pizarra…</p>;
  return (
    <div className="whiteboard">
      {status && <p className="board-status" aria-live="polite">{status}</p>}
      <WhiteboardCanvas initial={initial} readOnly={readOnly} onApi={setApi} onChange={handleChange} onPointer={handlePointer} />
    </div>
  );
}
