"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Student } from "../../../lib/domain/student";
import Modal from "../shared/modal";
import type { Member } from "../shared/model";
import { request } from "../shared/api";
import "./member-dialog.css";

/**
 * Diálogo para invitar cuentas y gestionar miembros del proyecto.
 * @param props - Fichas disponibles, permisos y acciones de cierre y recarga.
 * @returns El diálogo de gestión de miembros.
 */
export default function MemberDialog({ students, teachers, owner, admin, onClose, onChanged }: {
  students: Student[] | null;
  teachers: { id: string; name: string; displayName: string }[] | null;
  owner: boolean;
  admin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ email: "", role: "student" as "student" | "teacher" | "guest", studentSection: "", teacherId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);

  const studentLabel = (section: string) => { const student = students?.find((item) => item.section === section); return student ? student.displayName || student.name : "Ficha no disponible"; };
  const teacherLabel = (id: string) => { const teacher = teachers?.find((item) => item.id === id); return teacher ? teacher.displayName || teacher.name : "Ficha no disponible"; };

  async function load() {
    setError("");
    try { setMembers(await request<Member[]>("GET", undefined, "/api/members")); }
    catch (caught) { setError((caught as Error).message); }
  }

  useEffect(() => {
    let active = true;
    request<Member[]>("GET", undefined, "/api/members")
      .then((items) => { if (active) { setMembers(items); setError(""); } })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("POST", { ...form, studentSection: form.studentSection || null, teacherId: form.teacherId || null }, "/api/members");
      setForm({ email: "", role: "student", studentSection: "", teacherId: "" });
      await load();
      onChanged();
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!removeMember || busy) return;
    setBusy(true);
    setError("");
    try {
      await request("DELETE", { id: removeMember.id }, "/api/members");
      setRemoveMember(null);
      await load();
      onChanged();
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Gestionar miembros" onClose={() => { if (!busy) onClose(); }}>
      <div className="member-content">
        <p>Invita una cuenta de ChatGPT. La persona debe iniciar sesión con ese correo y aceptar antes de acceder.</p>
        <form onSubmit={save} className="task-form member-form">
          <label>Correo de la cuenta<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <div className="form-row">
            <label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "teacher" | "student" | "guest", studentSection: "", teacherId: "" })}><option value="student">Alumno</option>{(owner || admin) && <><option value="teacher">Profesor</option><option value="guest">Invitado · solo lectura</option></>}</select></label>
            {form.role === "student" && <label>Ficha de alumno<select required value={form.studentSection} onChange={(event) => setForm({ ...form, studentSection: event.target.value })}><option value="">Seleccionar ficha</option>{students?.map((student) => <option key={student.section} value={student.section}>{student.displayName || student.name}</option>)}</select></label>}
            {form.role === "teacher" && <label>Ficha de profesor<select required value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })}><option value="">Seleccionar ficha</option>{teachers?.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.displayName || teacher.name}</option>)}</select></label>}
          </div>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Crear invitación"}</button>
        </form>
        {error && <div role="alert" className="alert">{error}</div>}
        <h3>Invitaciones y miembros</h3>
        {members.length ? members.map((member) => <div className="member-row" key={member.id}>
          <div><strong>{member.email}</strong><small>{member.role === "teacher" ? "Profesor" : member.role === "student" ? "Alumno" : "Invitado"} · {member.status === "active" ? "Activo" : "Pendiente"}{member.studentSection ? ` · ${studentLabel(member.studentSection)}` : member.teacherId ? ` · ${teacherLabel(member.teacherId)}` : ""}</small></div>
          {(owner || admin || member.role === "student") && <><button type="button" className="text-button" disabled={busy} onClick={() => { setForm({ email: member.email, role: member.role, studentSection: member.studentSection ?? "", teacherId: member.teacherId ?? "" }); setRemoveMember(null); }}>Editar</button><button type="button" className="danger-quiet" disabled={busy} onClick={() => setRemoveMember(member)}>Quitar</button></>}
        </div>) : <p>Sin miembros añadidos.</p>}
        {removeMember && <div className="member-confirm"><p>¿Quitar el acceso de {removeMember.email} a este proyecto?</p><button type="button" className="secondary" disabled={busy} onClick={() => setRemoveMember(null)}>Cancelar</button><button type="button" className="danger" disabled={busy} onClick={() => void remove()}>Quitar acceso</button></div>}
      </div>
    </Modal>
  );
}
