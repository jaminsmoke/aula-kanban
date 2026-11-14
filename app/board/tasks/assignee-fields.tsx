"use client";

import type { TaskFields } from "../../../lib/domain/task";
import type { Student } from "../../../lib/domain/student";
import { personValue } from "./task-dialog-utils";

/**
 * Pestaña de responsables del formulario de tarea.
 * @param props - Formulario, fichas, permisos y acciones de asignación.
 * @returns Los selectores y atajos de responsables.
 */
export default function AssigneeFields({ form, onForm, canManage, students, teachers, ownStudent, claiming, onAddAssignee, onRemoveAssignee, onAssignee, onAssignClass, onRemoveClass }: {
  form: TaskFields;
  onForm: (form: TaskFields) => void;
  canManage: boolean;
  students: Student[] | null;
  teachers: { id: string; name: string; displayName: string }[] | null;
  ownStudent?: Student;
  claiming: boolean;
  onAddAssignee: () => void;
  onRemoveAssignee: (index: number) => void;
  onAssignee: (index: number, value: string) => void;
  onAssignClass: () => void;
  onRemoveClass: () => void;
}) {
  const classStudents = students ?? [];
  const allStudentsAssigned = Boolean(classStudents.length && classStudents.every((student) => form.assignees.some((person) => person.kind === "student" && person.profileId === student.section)));
  const selectablePeople = (students?.length ?? 0) + (teachers?.length ?? 0);
  const addDisabled = claiming || form.assignees.length >= 50 || (students !== null && teachers !== null && selectablePeople === 0) || (students !== null && teachers !== null && form.assignees.length >= selectablePeople && form.assignees.length > 0);

  function handleAddAssignee() {
    const nextIndex = form.assignees.length;
    onAddAssignee();
    window.requestAnimationFrame(() => {
      const select = document.querySelector(`[data-assignee-index="${nextIndex}"]`) as HTMLSelectElement | null;
      select?.focus();
    });
  }

  return (
    <div className="field assignee-field">
      <span className="field-label" id="task-assignees-label">Responsables</span>
      {canManage ? <>
        <div className="assignee-rows">
          {form.assignees.map((person, index) => {
            const taken = new Set(form.assignees.filter((_, position) => position !== index).map((item) => personValue(item.kind, item.profileId)));
            const value = personValue(person.kind, person.profileId);
            // A responsable eliminado de la clase conserva su fila como historial durante 30 días.
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
  );
}
