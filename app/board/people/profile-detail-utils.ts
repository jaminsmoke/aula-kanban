import type { Task } from "../../../lib/domain/task";

/**
 * Fecha local en formato `YYYY-MM-DD`.
 * @param date - Instante de referencia.
 * @returns La fecha local del instante.
 */
function localDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ordena las tareas de una ficha: pendientes vencidas, próximas entregas,
 * pendientes sin fecha y, al final, completadas.
 * @param tasks - Tareas asignadas.
 * @param today - Fecha local de referencia.
 * @returns Una copia ordenada de forma determinista.
 */
export function sortProfileTasks(tasks: Task[], today = localDateValue()): Task[] {
  const rank = (task: Task) => {
    if (task.status === "done") return 3;
    if (task.dueDate && task.dueDate < today) return 0;
    if (task.dueDate) return 1;
    return 2;
  };
  return [...tasks].sort((left, right) => {
    const byRank = rank(left) - rank(right);
    if (byRank) return byRank;
    if (left.dueDate && right.dueDate && left.dueDate !== right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    if (left.dueDate !== right.dueDate) return left.dueDate ? -1 : 1;
    return left.createdAt - right.createdAt || left.id.localeCompare(right.id);
  });
}

/**
 * Datos de perfil con contenido, en el orden de presentación.
 * @param person - Datos de la ficha.
 * @returns Solo los campos informados.
 */
export function profileInfoItems(person: { role: string; activities: string; aiHelp: string }) {
  const items: Array<{ key: "role" | "activities" | "ai"; label: string; value: string }> = [
    { key: "role", label: "Puesto de trabajo", value: person.role },
    { key: "activities", label: "Actividades cotidianas", value: person.activities },
    { key: "ai", label: "Ayuda de la IA", value: person.aiHelp },
  ];
  return items.filter((item) => item.value.trim().length > 0);
}
