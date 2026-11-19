/** Forma de inicio de una tarea de Gantt. */
export type GanttStartMode = "date" | "after";

/** Tarea editable de un diagrama Gantt. */
export type GanttTask = {
  id: string;
  name: string;
  startMode: GanttStartMode;
  startDate: string;
  afterId: string;
  duration: string;
  flags: string[];
};

/** Sección editable de un diagrama Gantt. */
export type GanttSection = {
  id: string;
  name: string;
  tasks: GanttTask[];
};

/** Modelo de contenido de un diagrama Gantt. */
export type GanttDocument = {
  title: string;
  dateFormat: string;
  sections: GanttSection[];
};

const GANTT_FLAGS = new Set(["done", "active", "crit", "milestone"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DURATION_PATTERN = /^\d+(?:\.\d+)?(?:ms|s|m|h|d|w|M|y)?$/;
const ID_PATTERN = /^[A-Za-z_][\w-]*$/;

/**
 * Comprueba si el código es un Gantt que el editor guiado puede interpretar.
 * @param code - Código Mermaid.
 * @returns `true` si todas sus líneas tienen una forma conocida.
 */
export function parseGanttDocument(code: string): GanttDocument | null {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const first = lines.shift()?.trim();
  if (!first || !/^gantt\b/i.test(first)) return null;

  let title = "";
  let dateFormat = "YYYY-MM-DD";
  const sections: GanttSection[] = [];
  let current: GanttSection = { id: "section-1", name: "General", tasks: [] };
  let counter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%")) continue;
    if (/^title\s+/i.test(line)) {
      title = line.replace(/^title\s+/i, "").trim();
      continue;
    }
    if (/^dateFormat\s+/i.test(line)) {
      dateFormat = line.replace(/^dateFormat\s+/i, "").trim();
      continue;
    }
    if (/^section\s+/i.test(line)) {
      if (current.tasks.length) sections.push(current);
      current = {
        id: `section-${sections.length + 1}`,
        name: line.replace(/^section\s+/i, "").trim(),
        tasks: [],
      };
      continue;
    }
    if (!line.includes(":")) return null;
    const separator = line.indexOf(":");
    const name = line.slice(0, separator).trim();
    const meta = line.slice(separator + 1).split(",").map((part) => part.trim()).filter(Boolean);
    if (!name || meta.length === 0) return null;

    const task = parseTask(meta, `t${counter + 1}`, name);
    if (!task) return null;
    counter += 1;
    current.tasks.push(task);
  }
  if (current.tasks.length) sections.push(current);
  return { title, dateFormat, sections };
}

/**
 * Interpreta los metadatos de una tarea.
 * @param meta - Fragmentos separados por comas.
 * @param fallbackId - Identificador si la tarea no tiene uno.
 * @param name - Nombre visible.
 * @returns La tarea o `null` si no se puede interpretar.
 */
function parseTask(meta: string[], fallbackId: string, name: string): GanttTask | null {
  const remaining = [...meta];
  const duration = remaining.at(-1);
  if (!duration || !DURATION_PATTERN.test(duration)) return null;
  remaining.pop();

  const start = remaining.at(-1);
  if (!start) return null;
  let startMode: GanttStartMode = "date";
  let startDate = "";
  let afterId = "";
  if (DATE_PATTERN.test(start)) {
    startDate = start;
  } else if (/^after\s+\S+$/i.test(start)) {
    startMode = "after";
    afterId = start.replace(/^after\s+/i, "");
  } else {
    return null;
  }
  remaining.pop();

  let id = fallbackId;
  const possibleId = remaining.at(-1);
  if (possibleId && ID_PATTERN.test(possibleId) && !GANTT_FLAGS.has(possibleId)) {
    id = possibleId;
    remaining.pop();
  }
  const flags = remaining.filter((flag) => GANTT_FLAGS.has(flag));
  if (remaining.some((flag) => !GANTT_FLAGS.has(flag))) return null;
  return { id, name, startMode, startDate, afterId, duration, flags };
}

/**
 * Genera código Gantt válido a partir del contenido editado.
 * @param document - Título, formato de fecha y secciones.
 * @returns Código Mermaid listo para guardar.
 */
export function serializeGanttDocument(document: GanttDocument): string {
  const lines = ["gantt"];
  const title = safeLabel(document.title);
  if (title) lines.push(`  title ${title}`);
  lines.push(`  dateFormat ${document.dateFormat.trim() || "YYYY-MM-DD"}`);
  for (const section of document.sections) {
    lines.push(`  section ${safeLabel(section.name) || "General"}`);
    for (const task of section.tasks) {
      const start = task.startMode === "after" && ID_PATTERN.test(task.afterId)
        ? `after ${task.afterId}`
        : DATE_PATTERN.test(task.startDate) ? task.startDate : "2026-01-01";
      const flags = task.flags.length ? `${task.flags.join(", ")}, ` : "";
      lines.push(`  ${safeLabel(task.name) || "Tarea"} :${flags}${task.id}, ${start}, ${normalizeGanttDuration(task.duration)}`);
    }
  }
  return lines.join("\n");
}

/**
 * Normaliza una duración para que el código generado siga siendo válido.
 * @param duration - Texto escrito por la persona.
 * @returns La duración válida o un día por defecto.
 */
export function normalizeGanttDuration(duration: string): string {
  const value = duration.trim();
  return DURATION_PATTERN.test(value) ? value : "1d";
}

/**
 * Limpia caracteres que separan campos en Mermaid.
 * @param value - Texto libre.
 * @returns Texto seguro para títulos, secciones y tareas.
 */
function safeLabel(value: string): string {
  return value.replace(/[:\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Crea una tarea nueva con un id que no choque con el documento.
 * @param tasks - Tareas existentes.
 * @returns Una tarea de un día para la fecha por defecto.
 */
export function createGanttTask(tasks: GanttTask[]): GanttTask {
  let index = tasks.length + 1;
  while (tasks.some((task) => task.id === `t${index}`)) index += 1;
  return {
    id: `t${index}`,
    name: "Nueva tarea",
    startMode: "date",
    startDate: "2026-01-01",
    afterId: "",
    duration: "1d",
    flags: [],
  };
}
