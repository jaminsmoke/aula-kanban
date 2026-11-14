"use client";

import { lazy, Suspense, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import "../shared/whiteboard.css";

const Whiteboard = lazy(() => import("../shared/whiteboard"));

/**
 * Pestaña de pizarra del diálogo de tarea.
 * @param props - Tarea, solo lectura y si la pestaña está activa.
 * @returns El panel con el lienzo y el control de ampliación.
 */
export default function TaskWhiteboard({ taskId, readOnly, active }: { taskId: string; readOnly: boolean; active: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div role="tabpanel" id="panel-pizarra" aria-labelledby="tab-pizarra" hidden={!active}>
      <div className={expanded ? "whiteboard-shell expanded" : "whiteboard-shell"}>
        <div className="whiteboard-shell-bar">
          <span className="field-hint">{expanded ? "Pizarra a pantalla completa" : "Pizarra de la tarea"}</span>
          <button type="button" className="icon-button whiteboard-expand" aria-pressed={expanded} aria-label={expanded ? "Reducir pizarra" : "Ampliar pizarra a pantalla completa"} title={expanded ? "Reducir pizarra" : "Ampliar pizarra a pantalla completa"} onClick={() => setExpanded((value) => !value)}>
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
        <Suspense fallback={<p className="board-loading" role="status">Cargando la pizarra…</p>}>
          <Whiteboard taskId={taskId} readOnly={readOnly} />
        </Suspense>
      </div>
    </div>
  );
}
