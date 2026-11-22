import { normalizeName, personLabel } from "../../../lib/domain/assignments";
import type { Student } from "../../../lib/domain/student";
import type { Task, TaskAssignee, TaskFields } from "../../../lib/domain/task";

/**
 * Indica si una tarea puede reclamarse: no tiene responsables vinculados y
 * el texto heredado está vacío o dice «por definir».
 * @param task - Tarea con asignaciones y texto de responsable.
 * @returns `true` si está libre.
 */
export function isFreeTask(task: Pick<Task, "assignee" | "assignees">): boolean {
  return !task.assignees.length && (!task.assignee.trim() || normalizeName(task.assignee) === "por definir");
}

/**
 * Comprueba si la cuenta puede usar la acción de autoasignación.
 * @param props - Tarea, ficha propia y permisos de la cuenta.
 * @returns `true` solo para una tarea libre y una ficha propia válida.
 */
export function canClaimTask({ task, ownStudent, canManage, isGuest }: {
  task?: Pick<Task, "assignee" | "assignees"> | null;
  ownStudent?: Student;
  canManage: boolean;
  isGuest: boolean;
}): boolean {
  return Boolean(task && ownStudent && !canManage && !isGuest && isFreeTask(task));
}

/**
 * Construye la referencia de alumno que se guarda al reclamar una tarea.
 * @param student - Ficha vinculada a la cuenta.
 * @returns La asignación propia.
 */
export function ownAssignee(student: Student): TaskAssignee {
  return { kind: "student", profileId: student.section, name: personLabel(student) };
}

/**
 * Construye el `PATCH` completo de autoasignación con la revisión actual.
 * Incluye el resto de campos sin cambios para que el servidor distinga la
 * reclamación de una edición parcial y no los sobrescriba.
 * @param task - Tarea abierta.
 * @param student - Ficha vinculada a la cuenta.
 * @returns Los cambios listos para `mutate`.
 */
export function claimChanges(task: Task, student: Student): { id: string; revision: number; changes: TaskFields } {
  const assignee = ownAssignee(student);
  return {
    id: task.id,
    revision: task.revision,
    changes: {
      title: task.title,
      description: task.description,
      imageUrl: task.imageUrl,
      assignee: assignee.name,
      assignees: [assignee],
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      documentId: task.documentId ?? null,
    },
  };
}
