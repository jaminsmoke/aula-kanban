"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { DataGroup, DataItem, Timeline as VisTimeline, TimelineOptions } from "vis-timeline";
import {
  TIMELINE_GROUPS,
  buildTimelineItems,
  parseTimelineDate,
  timelineRange,
  timelineWindow,
  toTimelineIsoDate,
  type TimelineDocument,
  type TimelineEpoch,
  type TimelineEvent,
  type TimelineRange,
} from "./timeline-model";

const TIMELINE_OPTIONS: TimelineOptions = {
  autoResize: true,
  height: "100%",
  editable: false,
  selectable: true,
  multiselect: false,
  stack: true,
  zoomable: true,
  moveable: true,
  showCurrentTime: false,
  orientation: { axis: "top" },
  margin: { item: { horizontal: 12, vertical: 8 }, axis: 10 },
};

/**
 * Devuelve la duración de una animación respetando la reducción de movimiento.
 * @param duration - Duración normal en milisegundos.
 * @returns La duración efectiva.
 */
function motionDuration(duration: number): number {
  if (typeof window === "undefined") return 0;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 0 : duration;
}

type UseTimelineCanvasOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  document: TimelineDocument;
  viewRange?: TimelineRange;
  pendingRange: TimelineRange | null;
  readOnly: boolean;
  onRangeChange: (range: TimelineRange) => void;
  onMarkDirty: () => void;
  onStatus: (message: string) => void;
  onClearPendingRange: () => void;
  onEditEvent: (event: TimelineEvent) => void;
  onEditEpoch: (epoch: TimelineEpoch) => void;
};

/**
 * Monta vis-timeline y expone sus controles sin mezclar el estado del documento.
 * @param options - Documento, rango, permisos y callbacks de edición.
 * @returns Referencia del contenedor, error de inicio y controles del lienzo.
 */
export function useTimelineCanvas({
  containerRef,
  document,
  viewRange,
  pendingRange,
  readOnly,
  onRangeChange,
  onMarkDirty,
  onStatus,
  onClearPendingRange,
  onEditEvent,
  onEditEpoch,
}: UseTimelineCanvasOptions) {
  const timelineRef = useRef<VisTimeline | null>(null);
  const documentRef = useRef(document);
  const viewRangeRef = useRef(viewRange);
  const [initError, setInitError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    documentRef.current = document;
    viewRangeRef.current = viewRange;
  }, [document, viewRange]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let active = true;
    let timeline: VisTimeline | null = null;
    setReady(false);

    void import("vis-timeline/standalone")
      .then(({ Timeline }) => {
        if (!active) return;
        try {
          const groups: DataGroup[] = TIMELINE_GROUPS.map((group) => ({ id: group.id, content: group.label }));
          const items: DataItem[] = buildTimelineItems(documentRef.current);
          const initialRange = viewRangeRef.current ?? timelineRange(documentRef.current);
          timeline = new Timeline(element, items, groups, {
            ...TIMELINE_OPTIONS,
            ...(initialRange ? {
              start: parseTimelineDate(initialRange.start),
              end: parseTimelineDate(initialRange.end),
            } : {}),
          });
          timelineRef.current = timeline;
          setReady(true);

          timeline.on("select", (properties) => {
            const selected = properties?.items?.[0];
            if (selected === undefined) return;
            const id = String(selected);
            if (id.startsWith("epoch-")) {
              const epoch = documentRef.current.epochs.find((item) => item.id === id.slice(6));
              if (epoch) onEditEpoch(epoch);
              return;
            }
            const event = documentRef.current.events.find((item) => item.id === id);
            if (event) onEditEvent(event);
          });

          timeline.on("rangechange", (properties) => {
            if (!properties?.start || !properties?.end) return;
            const next = {
              start: toTimelineIsoDate(new Date(properties.start)),
              end: toTimelineIsoDate(new Date(properties.end)),
            };
            onRangeChange(next);
            if (properties.byUser && !readOnly) onMarkDirty();
          });
        } catch {
          setInitError("No se pudo iniciar la línea temporal. Recarga la página para intentarlo de nuevo.");
        }
      })
      .catch(() => {
        if (active) {
          setInitError("No se pudo cargar el visor temporal. Recarga la página para intentarlo de nuevo.");
        }
      });

    return () => {
      active = false;
      timeline?.destroy();
      element.replaceChildren();
      timelineRef.current = null;
    };
  }, [containerRef, onEditEpoch, onEditEvent, onMarkDirty, onRangeChange, readOnly]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.setItems(buildTimelineItems(document));
  }, [document]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || !ready || !pendingRange) return;
    timeline.setWindow(parseTimelineDate(pendingRange.start), parseTimelineDate(pendingRange.end));
    onClearPendingRange();
  }, [onClearPendingRange, pendingRange, ready]);

  /**
   * Aplica un paso de zoom al lienzo.
   * @param direction - Acercar o alejar.
   */
  function zoom(direction: "in" | "out") {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const options = { animation: { duration: motionDuration(250) } };
    if (direction === "in") timeline.zoomIn(0.3, options);
    else timeline.zoomOut(0.3, options);
    if (!readOnly) onMarkDirty();
    onStatus(direction === "in" ? "Vista ampliada." : "Vista reducida.");
  }

  /**
   * Ajusta el rango visible a todos los elementos.
   */
  function fitTimeline() {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const range = timelineWindow(documentRef.current);
    if (range) timeline.setWindow(range.start, range.end);
    if (!readOnly) onMarkDirty();
    onStatus("Vista reajustada a toda la línea temporal.");
  }

  /**
   * Desplaza o amplía la línea temporal con el teclado.
   * @param event - Evento de teclado del lienzo.
   */
  function handleTimelineKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const range = timeline.getWindow();
    const span = range.end.getTime() - range.start.getTime();

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const shift = span * 0.12 * direction;
        timeline.setWindow(new Date(range.start.getTime() + shift), new Date(range.end.getTime() + shift));
        if (!readOnly) onMarkDirty();
        onStatus("Vista desplazada.");
        break;
      }
      case "+":
      case "=":
        event.preventDefault();
        zoom("in");
        return;
      case "-":
      case "_":
        event.preventDefault();
        zoom("out");
        return;
      case "0":
        event.preventDefault();
        fitTimeline();
        return;
      default:
        return;
    }

    event.preventDefault();
  }

  return {
    initError,
    zoomIn: () => zoom("in"),
    zoomOut: () => zoom("out"),
    fitTimeline,
    handleTimelineKeyDown,
  };
}
