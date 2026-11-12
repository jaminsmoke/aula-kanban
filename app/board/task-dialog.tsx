"use client";

import type { FormEvent } from "react";
import { ArrowRight, Trash2, X } from "lucide-react";
import { priorities, priorityNames, statuses } from "../task";
import type { Task, TaskFields } from "../task";
import type { Student } from "../student";
import Modal from "../modal";
import { columns } from "./model";

const personValue = (kind: string, profileId: string) => `${kind}:${profileId}`;

export default function TaskDialog({
  editor, form, onForm, formError, saving, deleting, onDeleting, canManage, canEditTask, ownStudent,
  students, teachers, claiming, onAddAssignee, onRemoveAssignee, onAssignee, onAssignClass, onSubmit, onClose, onDelete,
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
          <label>Responsables{canManage ? <>
            <div className="assignee-rows">
              {form.assignees.map((person, index) => {
                const taken = new Set(form.assignees.filter((_, position) => position !== index).map((item) => personValue(item.kind, item.profileId)));
                const value = personValue(person.kind, person.profileId);
                // A responsable eliminated from the class keeps their row as history for 30 days.
                const active = person.kind === "student" ? students?.some((student) => student.section === person.profileId) : teachers?.some((teacher) => teacher.id === person.profileId);
                return <div className="assignee-row" key={`${person.kind}:${person.profileId}:${index}`}>
                  <select aria-label={`Responsable ${index + 1}`} value={person.profileId ? value : ""} disabled={claiming} onChange={(event) => onAssignee(index, event.target.value)}>
                    {person.profileId && !active && <option value={value}>{person.name} (eliminado)</option>}
                    <option value="" disabled>Selecciona una persona</option>
                    <optgroup label="Alumnos">{students?.filter((student) => !taken.has(personValue("student", student.section))).map((student) => <option key={student.section} value={personValue("student", student.section)}>{student.displayName || student.name}</option>)}</optgroup>
                    <optgroup label="Profesores">{teachers?.filter((teacher) => !taken.has(personValue("teacher", teacher.id))).map((teacher) => <option key={teacher.id} value={personValue("teacher", teacher.id)}>{teacher.displayName || teacher.name}</option>)}</optgroup>
                  </select>
                  <button type="button" className="icon-button" aria-label={`Quitar responsable ${index + 1}`} disabled={claiming} onClick={() => onRemoveAssignee(index)}><X size={16} /></button>
                </div>;
              })}
            </div>
            <div className="assignee-actions">
              <button type="button" className="text-button" disabled={claiming} onClick={onAddAssignee}>Añadir responsable</button>
              <button type="button" className="text-button" disabled={claiming || !students?.length} onClick={onAssignClass}>Asignar a toda la clase</button>
            </div>
            {!form.assignees.length && <input maxLength={80} placeholder="Sin asignar o responsable en texto" value={form.assignee} onChange={(event) => onForm({ ...form, assignee: event.target.value })} />}
          </> : <select value={ownStudent && form.assignees.some(person => person.kind === "student" && person.profileId === ownStudent.section) ? ownStudent.section : ""} onChange={(event) => { const assigned = Boolean(event.target.value && ownStudent); onForm({ ...form, assignee: assigned ? ownStudent!.name : "", assignees: assigned ? [{ kind: "student", profileId: ownStudent!.section, name: ownStudent!.displayName || ownStudent!.name }] : [] }); }}>
            <option value="">Sin asignar</option>{ownStudent && <option value={ownStudent.section}>{ownStudent.displayName || ownStudent.name} (tú)</option>}
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
