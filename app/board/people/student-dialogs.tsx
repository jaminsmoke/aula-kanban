"use client";

import { useState, type FormEvent } from "react";
import type { Student } from "../../../lib/domain/student";
import Modal from "../../modal";
import { accountLabel } from "../shared/model";

/**
 * Diálogo para crear o editar una ficha de alumno.
 * @param props.student - Ficha del alumno.
 * @param props.error - Mensaje de error a mostrar.
 * @param props.saving - Si el formulario se está guardando.
 * @param props.onClose - Cierra el diálogo.
 * @param props.onConfirm - Confirma la acción.
 * @returns El formulario de la ficha de alumno.
 */
export function StudentFormDialog({ student, onChange, error, saving, onSubmit, onClose }: {
  student: Student;
  onChange: (student: Student) => void;
  error: string;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [initialEmail] = useState(student.accountEmail ?? "");
  const emailChanged = (student.accountEmail ?? "") !== initialEmail;
  return (
    <Modal title={student.revision ? "Editar perfil" : "Añadir alumno"} onClose={onClose}>
      <form onSubmit={onSubmit} className="task-form">
        <label>Nombre<input required maxLength={80} value={student.name} onChange={(event) => onChange({ ...student, name: event.target.value })} /></label>
        <label>Nombre a mostrar <span>(opcional)</span><input maxLength={80} placeholder="Igual que el nombre" value={student.displayName} onChange={(event) => onChange({ ...student, displayName: event.target.value })} /></label>
        <label>Correo de ChatGPT <span>(opcional)</span>{student.revision > 0 && <small className={`account-status ${emailChanged ? "pending" : student.accountStatus ?? "unlinked"}`}>{emailChanged ? "Cambio sin guardar" : accountLabel(student.accountStatus)}</small>}<input type="email" maxLength={254} value={student.accountEmail ?? ""} onChange={(event) => onChange({ ...student, accountEmail: event.target.value })} /></label>
        <p className="intro">Sin correo, la ficha no concede acceso. Añadir o cambiar el correo crea una invitación al guardar; no se envía ningún email. Cambiarlo o eliminarlo retira el acceso anterior.</p>
        <label>Puesto de trabajo<input maxLength={500} value={student.role} onChange={(event) => onChange({ ...student, role: event.target.value })} /></label>
        <label>Actividades cotidianas<textarea rows={3} maxLength={2000} value={student.activities} onChange={(event) => onChange({ ...student, activities: event.target.value })} /></label>
        <label>Ayuda de la IA<textarea rows={3} maxLength={2000} value={student.aiHelp} onChange={(event) => onChange({ ...student, aiHelp: event.target.value })} /></label>
        {error && <div role="alert" className="alert">{error}</div>}
        <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={saving}>{saving ? "Guardando…" : student.revision ? "Guardar cambios" : "Añadir alumno"}</button></div>
      </form>
    </Modal>
  );
}

/**
 * Diálogo de confirmación para eliminar una ficha de alumno.
 * @param props - Ficha, error, estado de guardado y acciones de cierre y confirmación.
 * @returns La confirmación de borrado con su histórico de 30 días.
 */
export function StudentDeleteDialog({ student, error, saving, onClose, onConfirm }: {
  student: Student;
  error: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Eliminar perfil" onClose={onClose}>
      <div className="share-content">
        <p>¿Quieres eliminar la ficha de {student.displayName || student.name}? Su cuenta pierde el acceso ahora. Sus tareas seguirán en el tablero con su nombre como alumno eliminado durante 30 días; después quedarán sin asignar y las tareas que creó aparecerán como del propietario del aula.</p>
        {error && <div role="alert" className="alert">{error}</div>}
        <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancelar</button><button type="button" className="danger" disabled={saving} onClick={onConfirm}>{saving ? "Eliminando…" : "Confirmar eliminación"}</button></div>
      </div>
    </Modal>
  );
}
