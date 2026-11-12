"use client";

import type { FormEvent } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { priorities, priorityNames, statuses } from "../task";
import type { Task, TaskFields } from "../task";
import type { Student } from "../student";
import Modal from "../modal";
import { columns } from "./model";

export default function TaskDialog({
  editor, form, onForm, formError, saving, deleting, onDeleting, canManage, canEditTask, ownStudent,
  students, teachers, claiming, onSubmit, onClose, onDelete,
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
  teachers: { id: string; name: string }[] | null;
  claiming: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <Modal title={editor.task && !canEditTask(editor.task) ? "Detalle de la tarea" : editor.task ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      {editor.task && !canEditTask(editor.task) ? <div className="share-content"><h3>{editor.task.title}</h3><p>{editor.task.description || "Sin descripción"}</p><p>Responsable: {editor.task.assignee || "Sin asignar"} · Estado: {columns[editor.task.status].name}</p><p>Prioridad: {priorityNames[editor.task.priority]}{editor.task.dueDate ? ` · Fecha: ${editor.task.dueDate}` : ""}</p><p>Creada por: {editor.task.creator || "No registrado"}</p></div> : <form onSubmit={onSubmit} className="task-form">
        {editor.task && <p className="intro">Creada por: {editor.task.creator || "No registrado"}</p>}
        <label>Título<input autoFocus required disabled={claiming} maxLength={120} placeholder="¿Qué hay que hacer?" value={form.title} onChange={(event) => onForm({ ...form, title: event.target.value })} /></label>
        <label>Descripción <span>(opcional)</span><textarea disabled={claiming} maxLength={2000} rows={3} placeholder="Detalles, materiales o enlaces" value={form.description} onChange={(event) => onForm({ ...form, description: event.target.value })} /></label>
        <div className="form-row">
          <label>Responsable{canManage ? <><select value={form.assignees[0] ? `${form.assignees[0].kind}:${form.assignees[0].profileId}` : ""} onChange={(event) => { const value = event.target.value; if (!value) { onForm({ ...form, assignees: [] }); return; } const split = value.indexOf(":"); const kind = value.slice(0, split) as "student" | "teacher", id = value.slice(split + 1); const name = kind === "student" ? students?.find(item => item.section === id)?.displayName : teachers?.find(item => item.id === id)?.name; if (name) onForm({ ...form, assignee: name, assignees: [{ kind, profileId: id, name }] }); }}><option value="">Sin ficha vinculada</option><optgroup label="Alumnos">{students?.map(student => <option key={student.section} value={`student:${student.section}`}>{student.displayName}</option>)}</optgroup><optgroup label="Profesores">{teachers?.map(teacher => <option key={teacher.id} value={`teacher:${teacher.id}`}>{teacher.name}</option>)}</optgroup></select>{!form.assignees.length && <input maxLength={80} placeholder="Sin asignar o responsable en texto" value={form.assignee} onChange={(event) => onForm({ ...form, assignee: event.target.value })} />}</> : <select value={ownStudent && form.assignees.some(person => person.kind === "student" && person.profileId === ownStudent.section) ? ownStudent.section : ""} onChange={(event) => { const assigned = Boolean(event.target.value && ownStudent); onForm({ ...form, assignee: assigned ? ownStudent!.name : "", assignees: assigned ? [{ kind: "student", profileId: ownStudent!.section, name: ownStudent!.displayName }] : [] }); }}>
            <option value="">Sin asignar</option>{ownStudent && <option value={ownStudent.section}>{ownStudent.displayName} (tú)</option>}
          </select>}</label>
          <label>Fecha de entrega<input disabled={claiming} type="date" value={form.dueDate} onChange={(event) => onForm({ ...form, dueDate: event.target.value })} /></label>
        </div>
        <div className="form-row">
          <label>Prioridad<select disabled={claiming} value={form.priority} onChange={(event) => onForm({ ...form, priority: event.target.value as TaskFields["priority"] })}>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityNames[priority]}</option>)}
          </select></label>
          <label>Estado<select disabled={claiming} value={form.status} onChange={(event) => onForm({ ...form, status: event.target.value as TaskFields["status"] })}>
            {statuses.map((status) => <option key={status} value={status}>{columns[status].name}</option>)}
          </select></label>
        </div>
        {claiming && <p className="intro">Asígnate esta tarea y guarda para poder editar sus detalles.</p>}
        {!canManage && !ownStudent && <p className="intro">El profesorado debe vincular tu cuenta a una ficha para que puedas asignarte tareas.</p>}
        {formError && <div role="alert" className="alert">{formError}</div>}
        {deleting && <p className="delete-prompt">¿Eliminar esta tarea del tablero de todo el grupo?</p>}
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
              <button type="submit" className="primary" disabled={saving}>{saving ? "Guardando…" : editor.task ? "Guardar cambios" : "Crear tarea"} <ArrowRight size={17} /></button>
            </>
          )}
        </div>
      </form>}
    </Modal>
  );
}
