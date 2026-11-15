/* eslint-disable @next/next/no-img-element -- Las imágenes son URLs externas puestas por el usuario; next/image no puede optimizar dominios arbitrarios */
import { CalendarDays, Flag, GripVertical } from "lucide-react";
import { useState } from "react";
import type { CSSProperties, HTMLAttributes, Ref } from "react";
import { priorityNames } from "../../../lib/domain/task";
import type { Task } from "../../../lib/domain/task";
import { formatDate } from "../shared/model";

/**
 * Tarjeta de una tarea en su columna Kanban.
 * @param props - Tarea, estado de arrastre, acciones y el cableado opcional de dnd-kit (nodo ordenable, estilo de transformación y props del asa de arrastre).
 * @returns La tarjeta clicable con su meta y asa de arrastre.
 */
export default function TaskCard({ task, dragging, editable, onEdit, style, nodeRef, activatorProps }: {
  task: Task;
  dragging: boolean;
  editable: boolean;
  onEdit: () => void;
  style?: CSSProperties;
  nodeRef?: Ref<HTMLButtonElement>;
  activatorProps?: HTMLAttributes<HTMLSpanElement>;
}) {
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null);
  const label = task.assignees.length ? task.assignees.map((person) => `${person.name}${person.removed ? " (eliminado)" : ""}`).join(", ") : task.assignee;
  const initials = (task.assignees[0]?.name ?? task.assignee).trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return (
    <button type="button" ref={nodeRef} style={style} className={dragging ? "card dragging" : "card"} onClick={onEdit} title={editable ? "Abrir tarea" : "Ver tarea (solo lectura)"}>
      {task.imageUrl && task.imageUrl !== brokenImageUrl && <img className="card-image" src={task.imageUrl} alt="" loading="lazy" onError={() => setBrokenImageUrl(task.imageUrl)} />}
      {task.imageUrl && task.imageUrl === brokenImageUrl && <span className="card-image-missing" role="status">Imagen no disponible</span>}
      <span className="card-top">
        <span className={`priority ${task.priority}`}><Flag size={12} /> {priorityNames[task.priority]}</span>
        <span className="grip" {...activatorProps} onClick={(event) => event.stopPropagation()}>
          <GripVertical size={16} />
        </span>
      </span>
      <strong>{task.title}</strong>
      {task.description && <span className="card-description">{task.description}</span>}
      {!task.assignees.length && task.assignee.trim() && task.assignee.trim().toLocaleLowerCase("es") !== "por definir" && <span className="legacy-assignee">Responsable sin vincular</span>}
      {(label || task.dueDate) && (
        <span className="card-meta">
          {label && <span className="assignee" title={label}><span className="avatar">{initials}</span><span>{label}</span></span>}
          {task.dueDate && <span className="date"><CalendarDays size={16} /> <time dateTime={task.dueDate}>{formatDate.format(new Date(task.dueDate + "T12:00:00"))}</time></span>}
        </span>
      )}
    </button>
  );
}
