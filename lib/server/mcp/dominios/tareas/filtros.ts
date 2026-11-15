import type { DecoratedTask } from "./comun";

export type TaskFilterArgs = {
  proyectoId?: string;
  estado?: string;
  prioridad?: string;
  alumno?: string;
  profesor?: string;
  texto?: string;
  vencimientoDesde?: string;
  vencimientoHasta?: string;
  sinFecha?: boolean;
  vencidas?: boolean;
  orden?: string;
  pagina?: number;
  porPagina?: number;
};

/**
 * Fecha de hoy en formato ISO para los filtros de vencimiento.
 * @returns Hoy como `YYYY-MM-DD`.
 */
function filtroVencidas(): { hoyIso: string } {
  const hoy = new Date();
  return { hoyIso: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}` };
}

/**
 * Filtros opcionales de `listar_tareas`, iguales a los de la vista del tablero.
 * @param tasks - Tareas decoradas de uno o varios proyectos.
 * @param args - Filtros recibidos de la herramienta.
 * @returns Las tareas que cumplen los filtros dados.
 */
export function applyFilters(
  tasks: DecoratedTask[],
  args: {
    estado?: string;
    prioridad?: string;
    alumno?: string;
    profesor?: string;
    texto?: string;
    vencimientoDesde?: string;
    vencimientoHasta?: string;
    sinFecha?: boolean;
    vencidas?: boolean;
  },
) {
  const query = (args.texto ?? "").trim().toLocaleLowerCase("es");
  const { hoyIso } = filtroVencidas();
  return tasks.filter((task) => {
    if (args.estado && task.status !== args.estado) return false;
    if (args.prioridad && task.priority !== args.prioridad) return false;
    if (args.alumno && !task.assignees.some((item) => item.kind === "student" && item.profileId === args.alumno)) return false;
    if (args.profesor && !task.assignees.some((item) => item.kind === "teacher" && item.profileId === args.profesor)) return false;
    if (args.vencimientoDesde && !(task.dueDate && task.dueDate >= args.vencimientoDesde)) return false;
    if (args.vencimientoHasta && !(task.dueDate && task.dueDate <= args.vencimientoHasta)) return false;
    if (args.sinFecha && task.dueDate) return false;
    if (args.vencidas && !(task.dueDate && task.dueDate < hoyIso && task.status !== "done")) return false;
    if (query) {
      const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Días de la semana que usa `vencidas`/`orden`: lunes a domingo en curso. */
const PRIORIDAD_ORDEN: Record<string, number> = { high: 0, normal: 1, low: 2 };

/**
 * Ordena las tareas filtradas según el `orden` pedido.
 * @param tasks - Tareas ya filtradas.
 * @param orden - `creacion` (por defecto), `vencimiento` o `prioridad`.
 * @returns Las tareas ordenadas (sin fecha al final en `vencimiento`).
 */
export function applyOrder(tasks: DecoratedTask[], orden?: string) {
  if (orden === "vencimiento") {
    return [...tasks].sort((a, b) => {
      const fechaA = a.dueDate || "9999-12-31";
      const fechaB = b.dueDate || "9999-12-31";
      if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  }
  if (orden === "prioridad") {
    return [...tasks].sort((a, b) => (PRIORIDAD_ORDEN[a.priority] - PRIORIDAD_ORDEN[b.priority]) || (a.createdAt - b.createdAt));
  }
  return tasks;
}
