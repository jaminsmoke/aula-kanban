"use client";

import type { FormEvent } from "react";
import Modal from "../modal";
import type { Teacher } from "./model";

export function TeacherFormDialog({ teacher, onChange, error, busy, onSubmit, onClose }: {
  teacher: Teacher;
  onChange: (teacher: Teacher) => void;
  error: string;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return <Modal title={teacher.revision ? "Editar profesor" : "Añadir profesor"} onClose={onClose}>
    <form className="task-form" onSubmit={onSubmit}>
      <label>Nombre<input autoFocus maxLength={80} required value={teacher.name} onChange={(event) => onChange({ ...teacher, name: event.target.value })} /></label>
      <label>Nombre a mostrar <span>(opcional)</span><input maxLength={80} placeholder="Igual que el nombre" value={teacher.displayName} onChange={(event) => onChange({ ...teacher, displayName: event.target.value })} /></label>
      <label>Correo de ChatGPT <span>(opcional)</span><input type="email" maxLength={254} value={teacher.accountEmail ?? ""} onChange={(event) => onChange({ ...teacher, accountEmail: event.target.value })} /></label>
      <p className="intro">Puedes añadir el correo más adelante. Al guardarlo se creará una invitación pendiente; cambiarlo o eliminarlo retirará el acceso anterior.</p>
      <label>Puesto de trabajo<input maxLength={500} value={teacher.role} onChange={(event) => onChange({ ...teacher, role: event.target.value })} /></label>
      <label>Actividades cotidianas<textarea maxLength={2000} value={teacher.activities} onChange={(event) => onChange({ ...teacher, activities: event.target.value })} /></label>
      <label>Ayuda de la IA<textarea maxLength={2000} value={teacher.aiHelp} onChange={(event) => onChange({ ...teacher, aiHelp: event.target.value })} /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>Guardar ficha</button>
    </form>
  </Modal>;
}

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
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-confirm-actions"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button> <button type="button" className="danger" onClick={onConfirm} disabled={busy}>Eliminar ficha</button></div>
    </div>
  </Modal>;
}
