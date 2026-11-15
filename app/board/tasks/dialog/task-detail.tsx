/* eslint-disable @next/next/no-img-element -- Las imágenes son URLs externas puestas por el usuario; next/image no puede optimizar dominios arbitrarios */
"use client";

import { CalendarDays, Flag } from "lucide-react";
import { priorityNames } from "../../../../lib/domain/task";
import type { Task } from "../../../../lib/domain/task";
import { columns, formatDate, initials } from "../../shared/model";

/**
 * Detalle de una tarea en solo lectura.
 * @param props - Tarea a mostrar.
 * @returns La ficha de detalle.
 */
export default function TaskDetail({ task }: { task: Task }) {
  const StatusIcon = columns[task.status].icon;
  return (
    <div className="task-detail">
      {task.imageUrl && <img className="task-detail-image" src={task.imageUrl} alt={task.title} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
      <div className="task-detail-heading">
        <h3>{task.title}</h3>
        <span className={`priority ${task.priority}`}><Flag size={12} /> {priorityNames[task.priority]}</span>
      </div>
      <p>{task.description || "Sin descripción"}</p>
      <dl className="task-detail-meta">
        <div>
          <dt>Responsables</dt>
          <dd>
            {task.assignees.length ? (
              <ul className="task-detail-people">
                {task.assignees.map((person) => (
                  <li key={`${person.kind}:${person.profileId}`}>
                    <span className="avatar">{initials(person.name)}</span>
                    <span>{person.name}</span>
                    {person.removed && <span className="removed-tag">(eliminado)</span>}
                  </li>
                ))}
              </ul>
            ) : task.assignee || "Sin asignar"}
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{StatusIcon && <StatusIcon size={15} />} {columns[task.status].name}</dd>
        </div>
        <div>
          <dt>Fecha de entrega</dt>
          <dd>{task.dueDate ? <time dateTime={task.dueDate}><CalendarDays size={14} /> {formatDate.format(new Date(`${task.dueDate}T12:00:00`))}</time> : "Sin fecha"}</dd>
        </div>
        <div>
          <dt>Creada por</dt>
          <dd>{task.creator || "No registrado"}</dd>
        </div>
      </dl>
    </div>
  );
}
