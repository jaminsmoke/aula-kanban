import type { Task } from "../../../lib/domain/task";

/**
 * Fecha local de hoy en formato `YYYY-MM-DD`.
 * @param date - Instante de referencia.
 * @returns La fecha local.
 */
function todayValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Indica si una tarea está pendiente y su fecha de entrega ya pasó.
 * Las completadas y las tareas sin fecha nunca están vencidas.
 * @param task - Tarea a comprobar.
 * @param today - Fecha local de referencia.
 * @returns `true` si debe mostrarse el aviso de vencimiento.
 */
export function isTaskOverdue(task: Pick<Task, "status" | "dueDate">, today = todayValue()): boolean {
  return task.status !== "done" && Boolean(task.dueDate) && task.dueDate < today;
}
