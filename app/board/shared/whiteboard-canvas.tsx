"use client";

import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { BoardElement, BoardFile, BoardSnapshot } from "./whiteboard-model";

/**
 * Lienzo de Excalidraw con la escena inicial y los avisos de sincronización.
 * @param props - Escena inicial, modo de lectura, API y handlers de cambios.
 * @returns El lienzo dentro de su contenedor de estilo.
 */
export default function WhiteboardCanvas({ initial, readOnly, onApi, onChange, onPointer }: {
  initial: BoardSnapshot;
  readOnly: boolean;
  onApi: (api: ExcalidrawImperativeAPI) => void;
  onChange: (elements: readonly BoardElement[], appState: Record<string, unknown>, files: Record<string, BoardFile>) => void;
  onPointer: (payload: { pointer?: { x: number; y: number } }) => void;
}) {
  return (
    <div className="whiteboard-canvas">
      <Excalidraw
        excalidrawAPI={onApi}
        initialData={{ elements: initial.elements as never, appState: (initial.appState ?? {}) as never, files: initial.files as never }}
        onChange={onChange as never}
        onPointerUpdate={onPointer as never}
        viewModeEnabled={readOnly}
      />
    </div>
  );
}
