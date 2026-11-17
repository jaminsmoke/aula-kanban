/** Grupo visible de la línea temporal. */
export type TimelineGroup = {
  id: string;
  label: string;
};

/** Color disponible para una época. */
export type TimelineEpochColor = "violet" | "teal" | "amber";

/** Rango visible guardado junto al documento. */
export type TimelineRange = {
  start: string;
  end: string;
};

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
  range?: TimelineRange;
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

/** Plantilla disponible en el panel lateral. */
export type TimelineTemplateId = "espacial" | "proyecto";

/** Plantilla con su documento de ejemplo. */
export type TimelineTemplate = {
  id: TimelineTemplateId;
  label: string;
  description: string;
  document: TimelineDocument;
};

/** Grupos fijos de la primera versión. */
export const TIMELINE_GROUPS: TimelineGroup[] = [
  { id: "hitos", label: "Hitos" },
  { id: "procesos", label: "Procesos" },
  { id: "personas", label: "Personas" },
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
      groupId: "procesos",
      start: "1961-04-12",
      description: "Primer vuelo tripulado alrededor del planeta.",
    },
    {
      id: "tereshkova",
      title: "Valentina Tereshkova",
      groupId: "personas",
      start: "1963-06-16",
      description: "Primera mujer en el espacio.",
    },
    {
      id: "apolo",
      title: "Apolo 11 llega a la Luna",
      groupId: "procesos",
      start: "1969-07-20",
      description: "Primer alunizaje tripulado.",
    },
    {
      id: "columbia",
      title: "Primer vuelo del transbordador",
      groupId: "procesos",
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

/** Plantilla de planificación de un proyecto de aula. */
export const PROJECT_TIMELINE: TimelineDocument = {
  events: [
    {
      id: "presentacion-proyecto",
      title: "Presentación del proyecto",
      groupId: "hitos",
      start: "2026-09-15",
      description: "Explicación del reto y reparto inicial de tareas.",
    },
    {
      id: "investigacion",
      title: "Investigación y fuentes",
      groupId: "procesos",
      start: "2026-09-21",
      end: "2026-10-09",
      description: "Búsqueda de información y selección de fuentes.",
    },
    {
      id: "primera-entrega",
      title: "Primera entrega",
      groupId: "hitos",
      start: "2026-10-16",
      description: "Revisión del borrador y ajustes del equipo.",
    },
    {
      id: "revision-clase",
      title: "Revisión en clase",
      groupId: "procesos",
      start: "2026-10-30",
      description: "Puesta en común y comentarios de los compañeros.",
    },
    {
      id: "exposicion-final",
      title: "Exposición final",
      groupId: "hitos",
      start: "2026-11-27",
      description: "Presentación del resultado ante el grupo.",
    },
  ],
  epochs: [
    {
      id: "preparacion",
      label: "Preparación",
      start: "2026-09-10",
      end: "2026-10-15",
      color: "violet",
    },
    {
      id: "cierre",
      label: "Cierre",
      start: "2026-11-01",
      end: "2026-12-05",
      color: "amber",
    },
  ],
};

/** Plantillas en el orden del selector. */
export const TIMELINE_TEMPLATES: TimelineTemplate[] = [
  {
    id: "espacial",
    label: "Carrera espacial",
    description: "Hitos, misiones y personas de la exploración del espacio.",
    document: STARTER_TIMELINE,
  },
  {
    id: "proyecto",
    label: "Proyecto de aula",
    description: "Fases, entregas y cierre de un proyecto en equipo.",
    document: PROJECT_TIMELINE,
  },
];

/**
 * Convierte una fecha ISO (`YYYY-MM-DD`) en una fecha local estable.
 * @param value - Fecha en formato ISO corto.
 * @returns La fecha al mediodía local.
 */
export function parseTimelineDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

/**
 * Convierte una fecha local en una fecha ISO corta (`YYYY-MM-DD`).
 * @param value - Fecha que se quiere serializar.
 * @returns La fecha sin hora ni zona horaria.
 */
export function toTimelineIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Comprueba que una fecha ISO corta existe y es válida.
 * @param value - Fecha candidata.
 * @returns `true` si el calendario la acepta.
 */
export function isValidTimelineDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseTimelineDate(value);
  return !Number.isNaN(parsed.getTime()) && toTimelineIsoDate(parsed) === value;
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
 * Convierte el rango calculado en fechas ISO para guardarlo.
 * @param document - Eventos y épocas.
 * @returns El rango visible o `undefined` si no hay elementos.
 */
export function timelineRange(document: TimelineDocument): TimelineRange | undefined {
  const windowRange = timelineWindow(document);
  if (!windowRange) return undefined;
  return {
    start: toTimelineIsoDate(windowRange.start),
    end: toTimelineIsoDate(windowRange.end),
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

/**
 * Valida una época leída de la base de datos.
 * @param value - Valor candidato.
 * @returns La época normalizada o `null`.
 */
function parseEpoch(value: unknown): TimelineEpoch | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
  const start = typeof candidate.start === "string" ? candidate.start : "";
  const end = typeof candidate.end === "string" ? candidate.end : "";
  const color = candidate.color;
  if (!id || !label || !isValidTimelineRange(start, end)) return null;
  if (color !== "violet" && color !== "teal" && color !== "amber") return null;
  return { id, label, start, end, color };
}

/**
 * Valida un evento leído de la base de datos.
 * @param value - Valor candidato.
 * @returns El evento normalizado o `null`.
 */
function parseEvent(value: unknown): TimelineEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const groupId = typeof candidate.groupId === "string" ? candidate.groupId : "";
  const start = typeof candidate.start === "string" ? candidate.start : "";
  const end = typeof candidate.end === "string" ? candidate.end : undefined;
  const description = typeof candidate.description === "string" ? candidate.description : undefined;
  if (!id || !title || !TIMELINE_GROUPS.some((group) => group.id === groupId)) return null;
  if (!isValidTimelineRange(start, end)) return null;
  return { id, title, groupId, start, end, description };
}

/**
 * Valida un documento guardado y descarta cualquier dato incompleto.
 * @param value - Estado leído de `app_documents`.
 * @returns El documento o `null` si no es utilizable.
 */
export function parseTimelineDocument(value: unknown): TimelineDocument | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.events) || !Array.isArray(candidate.epochs)) return null;
  if (candidate.events.length > 200 || candidate.epochs.length > 100) return null;

  const events = candidate.events.map(parseEvent);
  const epochs = candidate.epochs.map(parseEpoch);
  if (events.some((event) => event === null) || epochs.some((epoch) => epoch === null)) return null;

  let range: TimelineRange | undefined;
  if (typeof candidate.range === "object" && candidate.range !== null) {
    const rawRange = candidate.range as Record<string, unknown>;
    const start = typeof rawRange.start === "string" ? rawRange.start : "";
    const end = typeof rawRange.end === "string" ? rawRange.end : "";
    if (isValidTimelineRange(start, end)) range = { start, end };
  }

  return { events: events as TimelineEvent[], epochs: epochs as TimelineEpoch[], range };
}
