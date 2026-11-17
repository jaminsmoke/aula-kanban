/** Grupo visible de la línea temporal. */
export type TimelineGroup = {
  id: string;
  label: string;
};

/** Color disponible para una época. */
export type TimelineEpochColor = "violet" | "teal" | "amber";

/** Evento situado en una fecha o en un rango de fechas. */
export type TimelineEvent = {
  id: string;
  title: string;
  groupId: string;
  start: string;
  end?: string;
  description?: string;
};

/** Periodo de fondo que contextualiza varios eventos. */
export type TimelineEpoch = {
  id: string;
  label: string;
  start: string;
  end: string;
  color: TimelineEpochColor;
};

/** Documento temporal completo. */
export type TimelineDocument = {
  events: TimelineEvent[];
  epochs: TimelineEpoch[];
};

/** Elemento que consume vis-timeline, ya convertido a fechas. */
export type TimelineRenderItem = {
  id: string;
  group?: string;
  content: string;
  start: Date;
  end?: Date;
  type: "box" | "range" | "background";
  className: string;
  title?: string;
};

/** Grupos fijos de la primera versión. */
export const TIMELINE_GROUPS: TimelineGroup[] = [
  { id: "hitos", label: "Hitos" },
  { id: "misiones", label: "Misiones" },
  { id: "pioneras", label: "Pioneras" },
];

/** Colores disponibles para las épocas. */
export const EPOCH_COLORS: { id: TimelineEpochColor; label: string }[] = [
  { id: "violet", label: "Violeta" },
  { id: "teal", label: "Verde azulado" },
  { id: "amber", label: "Ámbar" },
];

/** Línea temporal de ejemplo sobre la carrera espacial. */
export const STARTER_TIMELINE: TimelineDocument = {
  events: [
    {
      id: "sputnik",
      title: "Sputnik 1",
      groupId: "hitos",
      start: "1957-10-04",
      description: "Primer satélite artificial de la historia.",
    },
    {
      id: "gagarin",
      title: "Yuri Gagarin orbita la Tierra",
      groupId: "misiones",
      start: "1961-04-12",
      description: "Primer vuelo tripulado alrededor del planeta.",
    },
    {
      id: "tereshkova",
      title: "Valentina Tereshkova",
      groupId: "pioneras",
      start: "1963-06-16",
      description: "Primera mujer en el espacio.",
    },
    {
      id: "apolo",
      title: "Apolo 11 llega a la Luna",
      groupId: "misiones",
      start: "1969-07-20",
      description: "Primer alunizaje tripulado.",
    },
    {
      id: "columbia",
      title: "Primer vuelo del transbordador",
      groupId: "misiones",
      start: "1981-04-12",
      description: "Comienza la era de los transbordadores reutilizables.",
    },
  ],
  epochs: [
    {
      id: "guerra-fria",
      label: "Guerra Fría",
      start: "1947-03-12",
      end: "1991-12-26",
      color: "amber",
    },
    {
      id: "carrera-espacial",
      label: "Carrera espacial",
      start: "1957-10-04",
      end: "1975-07-17",
      color: "violet",
    },
  ],
};

/**
 * Convierte una fecha ISO (`YYYY-MM-DD`) en una fecha local estable.
 * @param value - Fecha en formato ISO corto.
 * @returns La fecha al mediodía local.
 */
export function parseTimelineDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

/**
 * Comprueba que una fecha ISO corta existe y es válida.
 * @param value - Fecha candidata.
 * @returns `true` si el calendario la acepta.
 */
export function isValidTimelineDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseTimelineDate(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Formatea una fecha ISO para mostrarla en español.
 * @param value - Fecha ISO corta.
 * @returns La fecha abreviada.
 */
export function formatTimelineDate(value: string): string {
  if (!isValidTimelineDate(value)) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseTimelineDate(value));
}

/**
 * Comprueba que un rango tiene fechas válidas y está ordenado.
 * @param start - Inicio ISO.
 * @param end - Fin ISO opcional.
 * @returns `true` si se puede guardar.
 */
export function isValidTimelineRange(start: string, end?: string): boolean {
  if (!isValidTimelineDate(start)) return false;
  if (!end) return true;
  return isValidTimelineDate(end) && end >= start;
}

/**
 * Convierte el documento en los elementos que pinta vis-timeline.
 * @param document - Eventos y épocas.
 * @returns Los elementos listos para el lienzo.
 */
export function buildTimelineItems(document: TimelineDocument): TimelineRenderItem[] {
  const epochs: TimelineRenderItem[] = document.epochs.map((epoch) => ({
    id: `epoch-${epoch.id}`,
    content: epoch.label,
    start: parseTimelineDate(epoch.start),
    end: parseTimelineDate(epoch.end),
    type: "background",
    className: `timeline-epoch timeline-epoch--${epoch.color}`,
    title: `${epoch.label}: ${formatTimelineDate(epoch.start)} – ${formatTimelineDate(epoch.end)}`,
  }));

  const events: TimelineRenderItem[] = document.events.map((event) => ({
    id: event.id,
    group: event.groupId,
    content: event.title,
    start: parseTimelineDate(event.start),
    end: event.end ? parseTimelineDate(event.end) : undefined,
    type: event.end ? "range" : "box",
    className: "timeline-event",
    title: event.description,
  }));

  return [...epochs, ...events];
}

/**
 * Calcula el rango visible que cubre todos los eventos y épocas con margen.
 * @param document - Eventos y épocas.
 * @returns Inicio y fin del rango, o `null` si no hay elementos.
 */
export function timelineWindow(document: TimelineDocument): { start: Date; end: Date } | null {
  const items = buildTimelineItems(document);
  if (items.length === 0) return null;

  const startTime = Math.min(...items.map((item) => item.start.getTime()));
  const endTime = Math.max(...items.map((item) => (item.end ?? item.start).getTime()));
  const padding = Math.max(7 * 24 * 60 * 60 * 1000, (endTime - startTime) * 0.05);

  return {
    start: new Date(startTime - padding),
    end: new Date(endTime + padding),
  };
}

/**
 * Devuelve el grupo solicitado o el primero de la lista.
 * @param id - Identificador del grupo.
 * @returns El grupo correspondiente.
 */
export function timelineGroupLabel(id: string): string {
  return TIMELINE_GROUPS.find((group) => group.id === id)?.label ?? TIMELINE_GROUPS[0].label;
}
