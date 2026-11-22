/* eslint-disable @next/next/no-img-element -- Las imágenes son URLs externas puestas por el usuario; next/image no puede optimizar dominios arbitrarios */
"use client";

import { CalendarDays, Flag } from "lucide-react";
import { priorityNames } from "../../../../lib/domain/task";
import type { Task } from "../../../../lib/domain/task";
import type { TaskDocumentOption } from "../use-task-documents";
import { columns, formatDate, initials } from "../../shared/model";

const documentStatusLabel = {
  archived: "Documento archivado",
  deleted: "Documento en la papelera",
} as const;

/**
 * Detalle de una tarea en solo lectura.
 * @param props - Tarea a mostrar, documentos y apertura del vínculo.
 * @returns La ficha de detalle.
 */
export default function TaskDetail({ task, documents = [], onOpenDocument }: {
  task: Task;
  documents?: TaskDocumentOption[];
  onOpenDocument?: (documentId: string) => void;
}) {
  const StatusIcon = columns[task.status].icon;
  const document = task.documentId ? documents.find((item) => item.id === task.documentId) : undefined;
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
          <dd>{StatusIcon && <StatusIcon size={16} />} {columns[task.status].name}</dd>
        </div>
        <div>
          <dt>Fecha de entrega</dt>
          <dd>{task.dueDate ? <time dateTime={task.dueDate}><CalendarDays size={16} /> {formatDate.format(new Date(`${task.dueDate}T12:00:00`))}</time> : "Sin fecha"}</dd>
        </div>
        <div>
          <dt>Documento de entrega</dt>
          <dd>
            {!task.documentId ? "Sin documento" : document?.status === "active" ? (
              onOpenDocument ? (
                <button type="button" className="text-button" onClick={() => onOpenDocument(document.id)}>
                  Abrir {document.title || "documento"}
                </button>
              ) : (document.title || "Documento vinculado")
            ) : document ? documentStatusLabel[document.status] : "Documento no disponible"}
          </dd>
        </div>
        <div>
          <dt>Creada por</dt>
          <dd>{task.creator || "No registrado"}</dd>
        </div>
      </dl>
    </div>
  );
}
