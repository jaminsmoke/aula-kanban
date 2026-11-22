import type { deletedStudents, deletedTeachers, projectMembers, students, taskAssignees, teachers, tasks, userIdentities } from "../../../db/schema";
import type { TaskFields } from "../../domain/task";

/** Referencia a una ficha asignada a una tarea. */
export type TaskRef = { kind: "student" | "teacher"; profileId: string };

/** Campos de escritura de una tarea ya validados por la ruta. */
export type TaskWriteFields = Pick<TaskFields, "title" | "description" | "assignee" | "dueDate" | "priority" | "status"> & {
  imageUrl?: string;
  assignees?: TaskRef[];
  documentId?: string | null;
};

/** Cambio rápido de estado sin editar el resto de campos. */
export type TaskStatusChange = { status: TaskFields["status"] };

/** Cambio aceptado por PATCH. */
export type TaskUpdate = TaskWriteFields | TaskStatusChange;

/** Fila de tarea tal como la devuelve D1. */
export type TaskRow = typeof tasks.$inferSelect;

/** Datos del proyecto necesarios para decorar y validar tareas. */
export type ProjectData = {
  profiles: (typeof students.$inferSelect)[];
  staff: (typeof teachers.$inferSelect)[];
  removedProfiles: (typeof deletedStudents.$inferSelect)[];
  removedStaff: (typeof deletedTeachers.$inferSelect)[];
  refs: (typeof taskAssignees.$inferSelect)[];
  members: (typeof projectMembers.$inferSelect)[];
  identities: (typeof userIdentities.$inferSelect)[];
};

/** Tarea preparada para la respuesta de la API. */
export type DecoratedTask = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  assignee: string;
  assignees: Array<TaskRef & { name: string; removed?: boolean }>;
  documentId: string | null;
  dueDate: string;
  priority: string;
  status: string;
  createdAt: number;
  revision: number;
  creator: string | null;
};
