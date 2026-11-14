import type { Student } from "./student";
import type { Task } from "./task";

/**
 * Nombre visible de una ficha: el nick si existe, si no el nombre.
 * @param person - Ficha con nombre y nombre a mostrar opcional.
 * @returns El nombre a mostrar o `"Sin nombre"`.
 */
export function personLabel(person: { name: string; displayName?: string }) {
  return person.displayName?.trim() || person.name.trim() || "Sin nombre";
}

/**
 * Normaliza un nombre para compararlo sin tildes ni mayúsculas.
 * @param value - Nombre a normalizar.
 * @returns El nombre en minúsculas y sin diacríticos.
 */
export function normalizeName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Indica si una tarea está asignada a un alumno concreto.
 * Prioriza las asignaciones por identificador; con texto libre solo
 * coincide si el nombre es único entre los alumnos.
 * @param task - Tarea con asignaciones o texto de responsable.
 * @param student - Alumno a comprobar.
 * @param students - Todos los alumnos del proyecto.
 * @returns `true` cuando la tarea pertenece a ese alumno.
 */
export function taskBelongsTo(task: Pick<Task, "assignee"> & Partial<Pick<Task, "assignees">>, student: Student, students: Student[]) {
  if (task.assignees) return task.assignees.some(person => person.kind === "student" && person.profileId === student.section);
  const assignee = normalizeName(task.assignee);
  if (!assignee) return false;
  const matches = students.filter((item) => {
    const first = item.name.split(/\s+/)[0];
    const uniqueFirst = students.filter((other) => normalizeName(other.name.split(/\s+/)[0]) === normalizeName(first)).length === 1;
    return assignee === normalizeName(item.name) || assignee === normalizeName(item.displayName) || (uniqueFirst && assignee === normalizeName(first));
  });
  return matches.length === 1 && matches[0].section === student.section;
}
