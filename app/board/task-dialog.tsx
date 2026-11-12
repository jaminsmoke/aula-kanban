/* eslint-disable @next/next/no-img-element -- Las imágenes son URLs externas puestas por el usuario; next/image no puede optimizar dominios arbitrarios */
"use client";

import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, Flag, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { priorities, priorityNames, statuses } from "../task";
import type { Task, TaskFields } from "../task";
import type { Student } from "../student";
import Modal from "../modal";
import { columns, formatDate, initials } from "./model";

const personValue = (kind: string, profileId: string) => `${kind}:${profileId}`;
const Whiteboard = lazy(() => import("./whiteboard"));

function dateValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Diálogo para crear, editar o ver una tarea en solo lectura.
 * @param props - Editor, formulario, responsables, permisos y acciones.
 * @returns El diálogo de tarea o su detalle de solo lectura.
 */
export default function TaskDialog({
  editor, form, onForm, formError, saving, deleting, onDeleting, canManage, canEditTask, ownStudent,
  students, teachers, claiming, onAddAssignee, onRemoveAssignee, onAssignee, onAssignClass, onRemoveClass, onSubmit, onClose, onDelete,
}: {
  editor: { task?: Task; status: TaskFields["status"] };
  form: TaskFields;
  onForm: (form: TaskFields) => void;
  formError: string;
  saving: boolean;
  deleting: boolean;
  onDeleting: (deleting: boolean) => void;
  canManage: boolean;
  canEditTask: (task: Task) => boolean;
  ownStudent?: Student;
  students: Student[] | null;
  teachers: { id: string; name: string; displayName: string }[] | null;
  claiming: boolean;
  onAddAssignee: () => void;
  onRemoveAssignee: (index: number) => void;
  onAssignee: (index: number, value: string) => void;
  onAssignClass: () => void;
  onRemoveClass: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDelete: (task: Task) => void;
}) {
  const readOnly = Boolean(editor.task && !canEditTask(editor.task));
  const [tab, setTab] = useState<"resumen" | "asignaciones" | "pizarra">("resumen");
  const [boardExpanded, setBoardExpanded] = useState(false);
  // En la pestaña Pizarra el diálogo se ensancha para que el lienzo y sus
  // menús quepan; al ampliar, la pizarra se muestra como popup fijo sobre
  // el diálogo (sin hacerlo crecer) y la misma instancia sigue montada.
  const boardTab = !readOnly && Boolean(editor.task) && tab === "pizarra";
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);
  const titleError = formError === "Escribe un título para la tarea." ? formError : "";
  const classStudents = students ?? [];
  const allStudentsAssigned = Boolean(classStudents.length && classStudents.every((student) => form.assignees.some((person) => person.kind === "student" && person.profileId === student.section)));
  const selectablePeople = (students?.length ?? 0) + (teachers?.length ?? 0);
  const addDisabled = claiming || saving || form.assignees.length >= 50 || (students !== null && teachers !== null && selectablePeople === 0) || (students !== null && teachers !== null && form.assignees.length >= selectablePeople && form.assignees.length > 0);
  const duePreview = form.dueDate ? formatDate.format(new Date(`${form.dueDate}T12:00:00`)) : "Sin fecha";
  const pastDue = Boolean(form.dueDate && form.dueDate < dateValue(0));
  const StatusIcon = editor.task ? columns[editor.task.status].icon : null;
  const assigneesSummary = form.assignees.length ? form.assignees.map((person) => person.name).join(", ") : (form.assignee || "Sin asignar");

  function handleAddAssignee() {
    const nextIndex = form.assignees.length;
    onAddAssignee();
    window.requestAnimationFrame(() => {
      const select = document.querySelector(`[data-assignee-index="${nextIndex}"]`) as HTMLSelectElement | null;
      select?.focus();
    });
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setImageError("");
    try {
      const projectId = new URLSearchParams(window.location.search).get("project") || "default";
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", "task-image");
      const response = await fetch(`/api/uploads?project=${encodeURIComponent(projectId)}`, { method: "POST", body });
      const data = await response.json().catch(() => null) as { url?: unknown; message?: unknown } | null;
      if (!response.ok || typeof data?.url !== "string") throw new Error(data && typeof data.message === "string" ? data.message : "No se pudo subir la imagen.");
      onForm({ ...form, imageUrl: data.url });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!form.title.trim()) {
      setTab("resumen");
      onSubmit(event);
      return;
    }
    if (form.imageUrl && (!/^https?:\/\/\S+$/i.test(form.imageUrl.trim()) && !/^\/api\/files\/[A-Za-z0-9-]+$/.test(form.imageUrl.trim()) || form.imageUrl.trim().length > 2048)) {
      event.preventDefault();
      setTab("resumen");
      setImageError("Introduce una URL de imagen válida que empiece por http:// o https:// (o sube una imagen).");
      return;
    }
    setImageError("");
    onSubmit(event);
  }

  return (
    <Modal title={readOnly ? "Detalle de la tarea" : editor.task ? "Editar tarea" : "Nueva tarea"} onClose={onClose} closable={!saving} className={boardTab ? "task-dialog-board" : undefined}>
      {readOnly && editor.task ? <div className="task-detail">
        {editor.task.imageUrl && <img className="task-detail-image" src={editor.task.imageUrl} alt={editor.task.title} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
        <div className="task-detail-heading">
          <h3>{editor.task.title}</h3>
          <span className={`priority ${editor.task.priority}`}><Flag size={12} /> {priorityNames[editor.task.priority]}</span>
        </div>
        <p>{editor.task.description || "Sin descripción"}</p>
        <dl className="task-detail-meta">
          <div>
            <dt>Responsables</dt>
            <dd>
              {editor.task.assignees.length ? (
                <ul className="task-detail-people">
                  {editor.task.assignees.map((person) => (
                    <li key={`${person.kind}:${person.profileId}`}>
                      <span className="avatar">{initials(person.name)}</span>
                      <span>{person.name}</span>
                      {person.removed && <span className="removed-tag">(eliminado)</span>}
                    </li>
                  ))}
                </ul>
              ) : editor.task.assignee || "Sin asignar"}
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{StatusIcon && <StatusIcon size={15} />} {columns[editor.task.status].name}</dd>
          </div>
          <div>
            <dt>Fecha de entrega</dt>
            <dd>{editor.task.dueDate ? <time dateTime={editor.task.dueDate}><CalendarDays size={14} /> {formatDate.format(new Date(`${editor.task.dueDate}T12:00:00`))}</time> : "Sin fecha"}</dd>
          </div>
          <div>
            <dt>Creada por</dt>
            <dd>{editor.task.creator || "No registrado"}</dd>
          </div>
        </dl>
      </div> : <form onSubmit={handleSubmit} noValidate className={claiming ? "task-form claiming" : "task-form"}>
        {claiming && <p className="claim-banner">Asígnate esta tarea y guarda para poder editar sus detalles.</p>}
        {editor.task && <p className="intro">Creada por: {editor.task.creator || "No registrado"}</p>}
        <div className="task-tabs" role="tablist" aria-label="Secciones de la tarea">
          <button type="button" role="tab" id="tab-resumen" aria-selected={tab === "resumen"} aria-controls="panel-resumen" className={tab === "resumen" ? "task-tab active" : "task-tab"} onClick={() => setTab("resumen")}>Resumen</button>
          <button type="button" role="tab" id="tab-asignaciones" aria-selected={tab === "asignaciones"} aria-controls="panel-asignaciones" className={tab === "asignaciones" ? "task-tab active" : "task-tab"} onClick={() => setTab("asignaciones")}>Asignaciones{form.assignees.length > 0 ? ` (${form.assignees.length})` : ""}</button>
          {editor.task && <button type="button" role="tab" id="tab-pizarra" aria-selected={tab === "pizarra"} aria-controls="panel-pizarra" className={tab === "pizarra" ? "task-tab active" : "task-tab"} onClick={() => setTab("pizarra")}>Pizarra</button>}
        </div>
        <div role="tabpanel" id="panel-resumen" aria-labelledby="tab-resumen" hidden={tab !== "resumen"}>
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
          <input id="task-image" type="url" inputMode="url" maxLength={2048} disabled={claiming} placeholder="https://ejemplo.com/imagen.jpg" value={form.imageUrl} aria-invalid={Boolean(imageError)} aria-describedby={imageError ? "task-image-error" : undefined} onChange={(event) => { setImageError(""); onForm({ ...form, imageUrl: event.target.value }); }} />
          {imageError && <p id="task-image-error" role="alert" className="field-error">{imageError}</p>}
          {form.imageUrl && <div className="thumb-preview">
            <img key={form.imageUrl} src={form.imageUrl} alt="Vista previa de la miniatura" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <button type="button" className="text-button" disabled={claiming} onClick={() => onForm({ ...form, imageUrl: "" })}>Quitar miniatura</button>
          </div>}
          <p className="field-hint">Enlace directo a una imagen. Se muestra en la tarjeta del tablero para todo el grupo.</p>
          <div className="upload-row">
            <input hidden type="file" id="task-image-upload" disabled={claiming} accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void handleUpload(event.target.files?.[0]); event.target.value = ""; }} />
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
        </div>
        <div role="tabpanel" id="panel-asignaciones" aria-labelledby="tab-asignaciones" hidden={tab !== "asignaciones"}>
        <div className="field assignee-field">
          <span className="field-label" id="task-assignees-label">Responsables</span>
            {canManage ? <>
              <div className="assignee-rows">
                {form.assignees.map((person, index) => {
                  const taken = new Set(form.assignees.filter((_, position) => position !== index).map((item) => personValue(item.kind, item.profileId)));
                  const value = personValue(person.kind, person.profileId);
                  // A responsable eliminated from the class keeps their row as history for 30 days.
                  const active = person.kind === "student" ? students?.some((student) => student.section === person.profileId) : teachers?.some((teacher) => teacher.id === person.profileId);
                  return <div className="assignee-row" key={`${person.kind}:${person.profileId}:${index}`}>
                    <select data-assignee-index={index} aria-label={`Responsable ${index + 1}`} value={person.profileId ? value : ""} disabled={claiming} onChange={(event) => onAssignee(index, event.target.value)}>
                      {person.profileId && !active && <option value={value}>{person.name} (eliminado)</option>}
                      <option value="">Selecciona una persona</option>
                      <optgroup label="Alumnos">{students?.filter((student) => !taken.has(personValue("student", student.section))).map((student) => <option key={student.section} value={personValue("student", student.section)}>{student.displayName || student.name}</option>)}</optgroup>
                      <optgroup label="Profesores">{teachers?.filter((teacher) => !taken.has(personValue("teacher", teacher.id))).map((teacher) => <option key={teacher.id} value={personValue("teacher", teacher.id)}>{teacher.displayName || teacher.name}</option>)}</optgroup>
                    </select>
                    <button type="button" className="text-button remove-assignee" aria-label={`Quitar responsable ${index + 1}`} disabled={claiming} onClick={() => onRemoveAssignee(index)}>Quitar</button>
                  </div>;
                })}
              </div>
              <div className="assignee-actions">
                <button type="button" className="text-button" disabled={addDisabled} onClick={handleAddAssignee}>Añadir responsable</button>
                <button type="button" className="text-button" disabled={claiming || !classStudents.length} onClick={allStudentsAssigned ? onRemoveClass : onAssignClass}>
                  {allStudentsAssigned ? "Quitar clase" : `Asignar a toda la clase (${classStudents.length})`}
                </button>
              </div>
              {form.assignees.length > 0 && <p className="field-hint">Los responsables vinculados sustituyen al texto libre.</p>}
              {(students === null || teachers === null) && <p className="field-hint">Cargando responsables…</p>}
              {students !== null && teachers !== null && selectablePeople === 0 && <p className="field-hint">Sin fichas de alumnos o profesores. Puedes usar texto libre o crear fichas.</p>}
              {!form.assignees.length && <>
                <input id="task-assignee-text" aria-labelledby="task-assignees-label" maxLength={80} placeholder="Sin asignar o responsable en texto" value={form.assignee} onChange={(event) => onForm({ ...form, assignee: event.target.value })} />
                <p className="field-hint">Máx. 80 caracteres. Solo se usa si no hay responsables vinculados.</p>
              </>}
            </> : <>
              <select id="task-own-assignee" aria-labelledby="task-assignees-label" value={ownStudent && form.assignees.some(person => person.kind === "student" && person.profileId === ownStudent.section) ? ownStudent.section : ""} onChange={(event) => { const assigned = Boolean(event.target.value && ownStudent); onForm({ ...form, assignee: assigned ? ownStudent!.name : "", assignees: assigned ? [{ kind: "student", profileId: ownStudent!.section, name: ownStudent!.displayName || ownStudent!.name }] : [] }); }}>
                <option value="">Sin asignar</option>{ownStudent && <option value={ownStudent.section}>{ownStudent.displayName || ownStudent.name} (tú)</option>}
              </select>
              {ownStudent && <p className="field-hint">Solo puedes asignarte la tarea a ti.</p>}
            </>}
        </div>
        </div>
        {editor.task && <div role="tabpanel" id="panel-pizarra" aria-labelledby="tab-pizarra" hidden={tab !== "pizarra"}>
          <div className={boardExpanded ? "whiteboard-shell expanded" : "whiteboard-shell"}>
            <div className="whiteboard-shell-bar">
              <span className="field-hint">{boardExpanded ? "Pizarra a pantalla completa" : "Pizarra de la tarea"}</span>
              <button type="button" className="icon-button whiteboard-expand" aria-pressed={boardExpanded} aria-label={boardExpanded ? "Reducir pizarra" : "Ampliar pizarra a pantalla completa"} title={boardExpanded ? "Reducir pizarra" : "Ampliar pizarra a pantalla completa"} onClick={() => setBoardExpanded((value) => !value)}>
                {boardExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            <Suspense fallback={<p className="board-loading" role="status">Cargando la pizarra…</p>}>
              <Whiteboard taskId={editor.task.id} readOnly={readOnly || claiming} />
            </Suspense>
          </div>
        </div>}
        {!canManage && !ownStudent && <p className="intro">El profesorado debe vincular tu cuenta a una ficha para que puedas asignarte tareas.</p>}
        {formError && <div role="alert" className="alert">{formError}</div>}
        {deleting && editor.task && <div className="delete-confirm" role="group" aria-label="Confirmar eliminación">
          <p className="delete-prompt"><strong>¿Eliminar “{editor.task.title}”?</strong> Se eliminará del tablero de todo el grupo y no hay papelera.</p>
        </div>}
        <div className="modal-actions">
          {editor.task && !deleting && !claiming && <button type="button" className="danger-quiet" disabled={saving} onClick={() => onDeleting(true)}><Trash2 size={16} /> Eliminar</button>}
          <span className="spacer" />
          {deleting && editor.task ? (
            <>
              <button type="button" className="secondary" disabled={saving} onClick={() => onDeleting(false)}>Volver</button>
              <button type="button" className="danger" disabled={saving} onClick={() => onDelete(editor.task!)}>{saving ? "Eliminando…" : "Confirmar eliminación"}</button>
            </>
          ) : (
            <>
              <button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? "Guardando…" : claiming ? "Asignarme y guardar" : editor.task ? "Guardar cambios" : "Crear tarea"} <ArrowRight size={17} /></button>
            </>
          )}
        </div>
      </form>}
    </Modal>
  );
}
