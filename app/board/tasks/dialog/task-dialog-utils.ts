import type { TaskFields } from "../../../../lib/domain/task";

/**
 * Serializa una persona en el formato `kind:profileId` del selector.
 * @param kind - `student` o `teacher`.
 * @param profileId - Identificador de la ficha.
 * @returns El valor del `<option>`.
 */
export function personValue(kind: string, profileId: string): string {
  return `${kind}:${profileId}`;
}

/**
 * Compara dos formularios de tarea por todos los campos editables.
 * @param current - Formulario actual.
 * @param initial - Instantánea tomada al abrir la ficha.
 * @returns `true` si no hay cambios pendientes.
 */
export function sameTaskFields(current: TaskFields, initial: TaskFields): boolean {
  return current.title === initial.title
    && current.description === initial.description
    && current.imageUrl === initial.imageUrl
    && current.assignee === initial.assignee
    && current.dueDate === initial.dueDate
    && current.priority === initial.priority
    && current.status === initial.status
    && (current.documentId ?? null) === (initial.documentId ?? null)
    && current.assignees.length === initial.assignees.length
    && current.assignees.every((person, index) => {
      const original = initial.assignees[index];
      return original !== undefined
        && person.kind === original.kind
        && person.profileId === original.profileId
        && person.name === original.name
        && Boolean(person.removed) === Boolean(original.removed);
    });
}

/**
 * Fecha local desplazada respecto a hoy.
 * @param offsetDays - Días de desplazamiento.
 * @returns La fecha en formato `YYYY-MM-DD`.
 */
export function dateValue(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
