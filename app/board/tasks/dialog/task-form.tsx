/* eslint-disable @next/next/no-img-element -- Las imágenes son URLs externas puestas por el usuario; next/image no puede optimizar dominios arbitrarios */
"use client";

import { priorities, priorityNames, statuses } from "../../../../lib/domain/task";
import type { TaskFields } from "../../../../lib/domain/task";
import { columns, formatDate } from "../../shared/model";
import { dateValue } from "./task-dialog-utils";

/**
 * Pestaña Resumen del formulario de tarea.
 * @param props - Formulario, errores, subida de imagen y cambios.
 * @returns Los campos principales de la tarea.
 */
export default function TaskForm({ form, onForm, formError, claiming, imageError, onImageError, uploading, onUpload }: {
  form: TaskFields;
  onForm: (form: TaskFields) => void;
  formError: string;
  claiming: boolean;
  imageError: string;
  onImageError: (message: string) => void;
  uploading: boolean;
  onUpload: (file: File | undefined) => void;
}) {
  const titleError = formError === "Escribe un título para la tarea." ? formError : "";
  const duePreview = form.dueDate ? formatDate.format(new Date(`${form.dueDate}T12:00:00`)) : "Sin fecha";
  const pastDue = Boolean(form.dueDate && form.dueDate < dateValue(0));
  const assigneesSummary = form.assignees.length ? form.assignees.map((person) => person.name).join(", ") : (form.assignee || "Sin asignar");

  return (
    <>
      <div className="field">
        <div className="field-heading">
          <label htmlFor="task-title">Título</label>
          <span className="field-count">{form.title.length}/120</span>
        </div>
        <input id="task-title" autoFocus required disabled={claiming} maxLength={120} placeholder="¿Qué hay que hacer?" value={form.title} aria-invalid={Boolean(titleError)} aria-describedby={titleError ? "task-title-error" : undefined} onChange={(event) => onForm({ ...form, title: event.target.value })} />
        {titleError && <p id="task-title-error" className="field-error">{titleError}</p>}
      </div>
      <div className="field claim-muted">
        <div className="field-heading">
          <label htmlFor="task-description">Descripción <span>(opcional)</span></label>
          <span className="field-count">{form.description.length}/2000</span>
        </div>
        <textarea id="task-description" disabled={claiming} maxLength={2000} rows={3} placeholder="Detalles, materiales o enlaces" value={form.description} onChange={(event) => onForm({ ...form, description: event.target.value })} />
      </div>
      <div className="field claim-muted">
        <div className="field-heading">
          <label htmlFor="task-image">Miniatura <span>(URL de imagen, opcional)</span></label>
          <span className="field-count">{form.imageUrl.length}/2048</span>
        </div>
        <input id="task-image" type="url" inputMode="url" maxLength={2048} disabled={claiming} placeholder="https://ejemplo.com/imagen.jpg" value={form.imageUrl} aria-invalid={Boolean(imageError)} aria-describedby={imageError ? "task-image-error" : undefined} onChange={(event) => { onImageError(""); onForm({ ...form, imageUrl: event.target.value }); }} />
        {imageError && <p id="task-image-error" role="alert" className="field-error">{imageError}</p>}
        {form.imageUrl && <div className="thumb-preview">
          <img key={form.imageUrl} src={form.imageUrl} alt="Vista previa de la miniatura" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, imageUrl: "" })}>Quitar miniatura</button>
        </div>}
        <p className="field-hint">Enlace directo a una imagen. Se muestra en la tarjeta del tablero para todo el grupo.</p>
        <div className="upload-row">
          <input hidden type="file" id="task-image-upload" disabled={claiming} accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { onUpload(event.target.files?.[0]); event.target.value = ""; }} />
          <button type="button" className="secondary" disabled={claiming || uploading} onClick={() => document.getElementById("task-image-upload")?.click()}>{uploading ? "Subiendo…" : "Subir imagen desde el equipo"}</button>
          <span className="field-hint">Si el almacenamiento está activo, se guarda allí y se usa su URL interna.</span>
        </div>
      </div>
      <div className="field claim-muted">
        <div className="field-heading">
          <label htmlFor="task-due-date">Fecha de entrega</label>
          <span className="field-count">{duePreview}</span>
        </div>
        <input id="task-due-date" disabled={claiming} type="date" value={form.dueDate} onChange={(event) => onForm({ ...form, dueDate: event.target.value })} />
        <div className="date-quick" aria-label="Atajos de fecha">
          <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, dueDate: dateValue(0) })}>Hoy</button>
          <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, dueDate: dateValue(1) })}>Mañana</button>
          <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, dueDate: dateValue(3) })}>En 3 días</button>
          <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, dueDate: "" })}>Sin fecha</button>
        </div>
        {pastDue && <p className="date-warning">La fecha ya pasó.</p>}
      </div>
      <div className="form-row claim-muted">
        <div className="field">
          <span className="field-label" id="task-priority-label">Prioridad</span>
          <div className="segmented" role="group" aria-labelledby="task-priority-label">
            {priorities.map((priority) => (
              <button key={priority} type="button" className={`segmented-option ${priority}`} aria-pressed={form.priority === priority} disabled={claiming} onClick={() => onForm({ ...form, priority })}>
                {priorityNames[priority]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="task-status">Estado</label>
          <select id="task-status" disabled={claiming} value={form.status} onChange={(event) => onForm({ ...form, status: event.target.value as TaskFields["status"] })}>
            {statuses.map((status) => <option key={status} value={status}>{columns[status].name}</option>)}
          </select>
        </div>
      </div>
      <div className="task-summary" aria-live="polite">
        <span className="field-label">Responsables</span>
        <p>{assigneesSummary}</p>
      </div>
    </>
  );
}
