"use client";

import { useState, type FormEvent } from "react";
import Modal from "../../../modal";
import { accountLabel } from "../../shared/model";
import type { Teacher } from "./model";

/**
 * Formulario de crear o editar la ficha de un profesor.
 * @param props.teacher - Ficha del profesor.
 * @param props.error - Mensaje de error a mostrar.
 * @param props.busy - Si hay una escritura en curso.
 * @param props.onClose - Cierra el diálogo.
 * @param props.onConfirm - Confirma la acción.
 * @returns El diálogo de la ficha de profesor.
 */
export function TeacherFormDialog({ teacher, onChange, error, busy, onSubmit, onClose }: {
  teacher: Teacher;
  onChange: (teacher: Teacher) => void;
  error: string;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const [initialEmail] = useState(teacher.accountEmail ?? "");
  const emailChanged = (teacher.accountEmail ?? "") !== initialEmail;
  return <Modal title={teacher.revision ? "Editar profesor" : "Añadir profesor"} onClose={onClose}>
    <form className="task-form" onSubmit={onSubmit}>
      <label>Nombre<input autoFocus maxLength={80} required value={teacher.name} onChange={(event) => onChange({ ...teacher, name: event.target.value })} /></label>
      <label>Nombre a mostrar <span>(opcional)</span><input maxLength={80} placeholder="Igual que el nombre" value={teacher.displayName} onChange={(event) => onChange({ ...teacher, displayName: event.target.value })} /></label>
      <label>Correo de ChatGPT <span>(opcional)</span>{teacher.revision > 0 && <small className={`account-status ${emailChanged ? "pending" : teacher.accountStatus ?? "unlinked"}`}>{emailChanged ? "Cambio sin guardar" : accountLabel(teacher.accountStatus)}</small>}<input type="email" maxLength={254} value={teacher.accountEmail ?? ""} onChange={(event) => onChange({ ...teacher, accountEmail: event.target.value })} /></label>
      <p className="intro">Sin correo, la ficha no concede acceso. Añadir o cambiar el correo crea una invitación al guardar; no se envía ningún email. Cambiarlo o eliminarlo retira el acceso anterior.</p>
      <label>Puesto de trabajo<input maxLength={500} value={teacher.role} onChange={(event) => onChange({ ...teacher, role: event.target.value })} /></label>
      <label>Actividades cotidianas<textarea maxLength={2000} value={teacher.activities} onChange={(event) => onChange({ ...teacher, activities: event.target.value })} /></label>
      <label>Ayuda de la IA<textarea maxLength={2000} value={teacher.aiHelp} onChange={(event) => onChange({ ...teacher, aiHelp: event.target.value })} /></label>
      {error && <div role="alert" className="alert">{error}</div>}
      <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar ficha"}</button></div>
    </form>
  </Modal>;
}

/**
 * Confirmación de eliminación de la ficha de un profesor.
 * @param props - Ficha, error, estado de guardado, cierre y confirmación.
 * @returns El diálogo de confirmación de borrado.
 */
export function TeacherDeleteDialog({ teacher, error, busy, onClose, onConfirm }: {
  teacher: Teacher;
  error: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return <Modal title="Eliminar ficha" onClose={onClose}>
    <div className="share-content">
      <p>¿Eliminar la ficha de <strong>{teacher.displayName || teacher.name}</strong>? Su cuenta pierde el acceso ahora. Sus tareas seguirán en el tablero con su nombre como profesor eliminado durante 30 días; después quedarán sin asignar y las tareas que creó aparecerán como del propietario del aula.</p>
      {error && <div role="alert" className="alert">{error}</div>}
      <div className="modal-actions"><span className="spacer" /><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button type="button" className="danger" onClick={onConfirm} disabled={busy}>{busy ? "Eliminando…" : "Eliminar ficha"}</button></div>
    </div>
  </Modal>;
}
