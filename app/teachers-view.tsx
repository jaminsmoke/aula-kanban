"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, LayoutGrid, Lightbulb, List, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Task } from "./task";
import type { Student } from "./student";
import { taskBelongsTo } from "./assignments";

type Teacher = { id: string; projectId: string; name: string; role: string; activities: string; aiHelp: string; revision: number };
const blank = () => ({ id: crypto.randomUUID(), projectId: "", name: "", role: "", activities: "", aiHelp: "", revision: 0 });
const statusNames = { pending: "Por hacer", active: "En curso", review: "En revisión", done: "Hecho" };

export default function TeachersView({ projectId, canManage, tasks, students, openTask }: { projectId: string; canManage: boolean; tasks: Task[] | null; students: Student[] | null; openTask: (task: Task) => void }) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Teacher | null>(null);
  const [removing, setRemoving] = useState<Teacher | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/teachers?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar los profesores.");
      setTeachers(await res.json()); setError("");
    } catch (e) { setError((e as Error).message); }
  }, [projectId]);
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 15000); return () => window.clearInterval(interval); }, [load]);
  useEffect(() => { if (form || removing) dialog.current?.showModal(); }, [Boolean(form), Boolean(removing)]);
  async function send(method: string, body: unknown) {
    const res = await fetch(`/api/teachers?project=${encodeURIComponent(projectId)}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({})) as Teacher & { message?: string };
    if (!res.ok) throw new Error(data.message || "No se pudo guardar la ficha.");
    return data;
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!form || busy) return; setBusy(true); setError("");
    try {
      const { id, name, role, activities, aiHelp, revision } = form;
      const saved = await send(revision ? "PATCH" : "POST", { id, name, role, activities, aiHelp, ...(revision ? { revision } : {}) });
      setForm(null); setSelected(saved.id); await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!removing || busy) return; setBusy(true); setError("");
    try { await send("DELETE", { id: removing.id, revision: removing.revision }); setRemoving(null); setSelected(null); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const teacher = teachers?.find(item => item.id === selected);
  const allPeople: Student[] = [...(students ?? []), ...(teachers ?? []).map(item => ({ section: item.id, name: item.name, displayName: item.name, role: item.role, activities: item.activities, aiHelp: item.aiHelp, revision: item.revision }))];
  const teacherAsStudent = allPeople.find(person => person.section === teacher?.id);
  const assigned = teacherAsStudent && students !== null ? (tasks ?? []).filter(task => taskBelongsTo(task, teacherAsStudent, allPeople)) : [];
  return <section className="students-view">
    <p className="eyebrow"><span /> Equipo docente</p>
    <div className="students-heading"><div className="students-title-row"><h1>Profesores</h1>{canManage && <button className="primary add-student" type="button" title="Añadir profesor" aria-label="Añadir profesor" onClick={() => { setError(""); setForm(blank()); }}><Plus size={20} /></button>}</div><p className="intro">Fichas del profesorado y tareas asignadas.</p></div>
    {error && !form && !removing && <div className="alert" role="alert">{error} <button className="text-button" onClick={() => void load()}>Reintentar</button></div>}
    {selected ? teacher ? <div className="student-detail">
      <button className="text-button back-link" onClick={() => setSelected(null)}>← Todos los profesores</button>
      <div className="student-profile-header"><span className="student-profile-avatar">{teacher.name.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()}</span><div className="student-identity"><span className="student-kicker">Ficha de profesor</span><h2>{teacher.name}</h2><p>{teacher.role || "Puesto sin especificar"}</p></div>{canManage && <><button className="profile-edit" title="Editar perfil" aria-label="Editar perfil" onClick={() => { setError(""); setForm(teacher); }}><Pencil size={18} /></button><button className="profile-delete" title="Eliminar perfil" aria-label="Eliminar perfil" onClick={() => { setError(""); setRemoving(teacher); }}><Trash2 size={18} /></button></>}</div>
      <div className="student-info"><div className="student-info-card"><span className="info-icon role"><BriefcaseBusiness size={18} /></span><div><h3>Puesto de trabajo</h3><p>{teacher.role || "Sin especificar"}</p></div></div><div className="student-info-card"><span className="info-icon activities"><ListTodo size={18} /></span><div><h3>Actividades cotidianas</h3><p>{teacher.activities || "Sin especificar"}</p></div></div><div className="student-info-card"><span className="info-icon ai"><Lightbulb size={18} /></span><div><h3>Ayuda de la IA</h3><p>{teacher.aiHelp || "Sin especificar"}</p></div></div></div>
      <h3 className="student-tasks-title">Sus tareas <span>({assigned.length})</span></h3>{tasks === null || students === null ? <p>Cargando tareas…</p> : assigned.length ? assigned.map(task => <button className="student-task" key={task.id} onClick={() => openTask(task)}><strong>{task.title}</strong><span className={`student-status ${task.status}`}>{statusNames[task.status]}</span></button>) : <p className="intro">Todavía no tiene tareas asignadas.</p>}
    </div> : <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => setSelected(null)}>← Todos los profesores</button></div> : <><div className="students-view-options"><span>{teachers?.length ?? 0} profesores</span><div className="layout-toggle" role="group" aria-label="Seleccionar vista de profesores"><button aria-label="Vista mosaico" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><LayoutGrid size={18} /></button><button aria-label="Vista lista" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List size={18} /></button></div></div><div className={layout === "grid" ? "students-grid" : "students-grid students-list"}>
      {teachers === null ? <p>Cargando fichas…</p> : teachers.length === 0 ? <p className="intro">Aún no hay fichas de profesores en este proyecto.</p> : teachers.map(item => <button className="student-card" key={item.id} onClick={() => setSelected(item.id)}><span className="student-avatar">{item.name.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()}</span><span><strong>{item.name}</strong><small>{item.role || "Puesto sin especificar"}</small></span><ArrowRight size={17} /></button>)}
    </div></>}
    {(form || removing) && <dialog ref={dialog} aria-label={form ? "Ficha de profesor" : "Eliminar ficha de profesor"} onCancel={event => { event.preventDefault(); setForm(null); setRemoving(null); }}>
      <div className="modal-header"><h2>{form ? (form.revision ? "Editar profesor" : "Añadir profesor") : "Eliminar ficha"}</h2><button className="icon-button" aria-label="Cerrar" onClick={() => { setForm(null); setRemoving(null); }}><X size={20} /></button></div>
      {form ? <form className="task-form" onSubmit={save}><label>Nombre<input autoFocus maxLength={80} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Puesto de trabajo<input maxLength={500} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></label><label>Actividades cotidianas<textarea maxLength={2000} value={form.activities} onChange={e => setForm({ ...form, activities: e.target.value })} /></label><label>Ayuda de la IA<textarea maxLength={2000} value={form.aiHelp} onChange={e => setForm({ ...form, aiHelp: e.target.value })} /></label><p className="intro">La ficha no concede acceso: gestiona las cuentas desde «Gestionar miembros».</p>{error && <p className="admin-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Guardar ficha</button></form> : <div className="share-content"><p>¿Eliminar la ficha de <strong>{removing?.name}</strong>? Su cuenta y sus permisos de acceso no se modificarán.</p>{error && <p className="admin-error" role="alert">{error}</p>}<div className="admin-confirm-actions"><button className="secondary" onClick={() => setRemoving(null)} disabled={busy}>Cancelar</button> <button className="danger" onClick={() => void remove()} disabled={busy}>Eliminar ficha</button></div></div>}
    </dialog>}
  </section>;
}
