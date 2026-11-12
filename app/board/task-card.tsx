import { CalendarDays, Flag, GripVertical } from "lucide-react";
import type { PointerEvent } from "react";
import { priorityNames } from "../task";
import type { Task } from "../task";
import { formatDate } from "./model";

export type GripEvent = PointerEvent<HTMLSpanElement>;

export default function TaskCard({ task, dragging, editable, onEdit, onGrab, onMove, onRelease, onCancel }: {
  task: Task;
  dragging: boolean;
  editable: boolean;
  onEdit: () => void;
  onGrab: (event: GripEvent) => void;
  onMove: (event: GripEvent) => void;
  onRelease: (event: GripEvent) => void;
  onCancel: () => void;
}) {
  const label = task.assignees.length ? task.assignees.map((person) => `${person.name}${person.removed ? " (eliminado)" : ""}`).join(", ") : task.assignee;
  const initials = (task.assignees[0]?.name ?? task.assignee).trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  return (
    <button type="button" className={dragging ? "card dragging" : "card"} onClick={onEdit} title={editable ? "Abrir tarea" : "Ver tarea (solo lectura)"}>
      <span className="card-top">
        <span className={`priority ${task.priority}`}><Flag size={12} /> {priorityNames[task.priority]}</span>
        <span className="grip" aria-hidden
          onPointerDown={onGrab} onPointerMove={onMove} onPointerUp={onRelease}
          onPointerCancel={onCancel} onLostPointerCapture={onCancel}
          onClick={(event) => event.stopPropagation()}>
          <GripVertical size={17} />
        </span>
      </span>
      <strong>{task.title}</strong>
      {task.description && <span className="card-description">{task.description}</span>}
      {!task.assignees.length && task.assignee.trim() && task.assignee.trim().toLocaleLowerCase("es") !== "por definir" && <span className="legacy-assignee">Responsable sin vincular</span>}
      {(label || task.dueDate) && (
        <span className="card-meta">
          {label && <span className="assignee" title={label}><span className="avatar">{initials}</span><span>{label}</span></span>}
          {task.dueDate && <span className="date"><CalendarDays size={14} /> <time dateTime={task.dueDate}>{formatDate.format(new Date(task.dueDate + "T12:00:00"))}</time></span>}
        </span>
      )}
    </button>
  );
}
