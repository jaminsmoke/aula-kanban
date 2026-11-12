"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Task } from "./task";
import type { Student } from "./student";
import { taskBelongsTo } from "./assignments";
import LayoutToggle from "./board/layout-toggle";
import ProfileCard from "./board/profile-card";
import ProfileDetail from "./board/profile-detail";
import { TeacherDeleteDialog, TeacherFormDialog } from "./teachers/teacher-dialogs";
import { blankTeacher } from "./teachers/model";
import type { Teacher } from "./teachers/model";

async function fetchTeachers(projectId: string): Promise<Teacher[]> {
  const response = await fetch(`/api/teachers?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron cargar los profesores.");
  return response.json();
}

export default function TeachersView({ projectId, isAdmin, ownTeacherId, tasks, students, openTask }: { projectId: string; isAdmin: boolean; ownTeacherId: string | null; tasks: Task[] | null; students: Student[] | null; openTask: (task: Task) => void }) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Teacher | null>(null);
  const [removing, setRemoving] = useState<Teacher | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setTeachers(await fetchTeachers(projectId)); setError(""); }
    catch (caught) { setError((caught as Error).message); }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    fetchTeachers(projectId)
      .then((items) => { if (active) { setTeachers(items); setError(""); } })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    const interval = window.setInterval(() => { void load(); }, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [projectId, load]);

  async function send(method: string, body: unknown) {
    const response = await fetch(`/api/teachers?project=${encodeURIComponent(projectId)}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as Teacher & { message?: string };
    if (!response.ok) throw new Error(data.message || "No se pudo guardar la ficha.");
    return data;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true); setError("");
    try {
      const { id, name, role, activities, aiHelp, revision } = form;
      const saved = await send(revision ? "PATCH" : "POST", { id, name, role, activities, aiHelp, accountEmail: form.accountEmail ?? "", ...(revision ? { revision } : {}) });
      setForm(null); setSelected(saved.id); await load();
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing || busy) return;
    setBusy(true); setError("");
    try {
      await send("DELETE", { id: removing.id, revision: removing.revision });
      setRemoving(null); setSelected(null); await load();
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  const teacher = teachers?.find((item) => item.id === selected);
  const allPeople: Student[] = [...(students ?? []), ...(teachers ?? []).map(item => ({ section: item.id, name: item.name, displayName: item.name, role: item.role, activities: item.activities, aiHelp: item.aiHelp, revision: item.revision }))];
  const teacherAsStudent = allPeople.find((person) => person.section === teacher?.id);
  const assigned = teacherAsStudent && students !== null ? (tasks ?? []).filter(task => task.assignees?.length ? task.assignees.some(person => person.kind === "teacher" && person.profileId === teacher?.id) : taskBelongsTo(task, teacherAsStudent, allPeople)) : [];

  return <section className="students-view">
    <p className="eyebrow"><span /> Equipo docente</p>
    <div className="students-heading"><div className="students-title-row"><h1>Profesores</h1>{isAdmin && <button className="primary add-student" type="button" title="Añadir profesor" aria-label="Añadir profesor" onClick={() => { setError(""); setForm(blankTeacher()); }}><Plus size={20} /></button>}</div><p className="intro">Fichas del profesorado y tareas asignadas.</p></div>
    {error && !form && !removing && <div className="alert" role="alert">{error} <button className="text-button" onClick={() => void load()}>Reintentar</button></div>}
    {selected ? teacher ? <ProfileDetail
      kicker="Ficha de profesor"
      backLabel="Todos los profesores"
      person={{ name: teacher.name, role: teacher.role, activities: teacher.activities, aiHelp: teacher.aiHelp, accountStatus: teacher.accountStatus }}
      canEdit={isAdmin || ownTeacherId === teacher.id}
      onBack={() => setSelected(null)}
      onEdit={() => { setError(""); setForm(teacher); }}
      onRemove={() => { setError(""); setRemoving(teacher); }}
      tasks={assigned}
      loading={tasks === null || students === null}
      onOpenTask={openTask}
    /> : <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => setSelected(null)}>← Todos los profesores</button></div> : <>
      <LayoutToggle count={teachers?.length ?? 0} unit="profesores" ariaLabel="Seleccionar vista de profesores" layout={layout} onLayout={setLayout} />
      <div className={layout === "grid" ? "students-grid" : "students-grid students-list"}>
        {teachers === null ? <p>Cargando fichas…</p> : teachers.length === 0 ? <p className="intro">Aún no hay fichas de profesores en este proyecto.</p> : teachers.map(item => <ProfileCard key={item.id} name={item.name} role={item.role} accountStatus={item.accountStatus} onOpen={() => setSelected(item.id)} />)}
      </div>
    </>}
    {form && <TeacherFormDialog teacher={form} onChange={setForm} error={error} busy={busy} onSubmit={save} onClose={() => setForm(null)} />}
    {removing && <TeacherDeleteDialog teacher={removing} error={error} busy={busy} onClose={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </section>;
}
