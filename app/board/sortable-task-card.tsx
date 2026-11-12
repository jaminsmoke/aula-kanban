"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../task";
import TaskCard from "./task-card";

/**
 * Tarjeta de tarea ordenable con dnd-kit: el asa responde a puntero y teclado.
 * @param props - Tarea, estado de arrastre, permiso de edición, si puede arrastrarse y acción de edición.
 * @returns La tarjeta con el nodo ordenable y su asa activada.
 */
export default function SortableTaskCard({ task, dragging, editable, disabled, onEdit }: {
  task: Task;
  dragging: boolean;
  editable: boolean;
  disabled: boolean;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, disabled });
  return (
    <TaskCard
      task={task}
      dragging={dragging}
      editable={editable}
      onEdit={onEdit}
      nodeRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      activatorProps={{ ...attributes, ...listeners, "aria-label": `Arrastrar tarea «${task.title}»` }}
    />
  );
}
