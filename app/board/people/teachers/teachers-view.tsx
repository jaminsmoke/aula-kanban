"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { GraduationCap, Plus, Users, Wrench } from "lucide-react";
import type { Task } from "../../../../lib/domain/task";
import type { Student } from "../../../../lib/domain/student";
import { taskBelongsTo } from "../../../../lib/domain/assignments";
import LayoutToggle from "../../layout/layout-toggle";
import ProfileCard from "../profile-card";
import ProfileDetail from "../profile-detail";
import PeopleEmptyState from "../empty-state";
import { TeacherDeleteDialog, TeacherFormDialog } from "./teacher-dialogs";
import BooksToolsPanel from "../tools/books-tools-panel";
import { blankTeacher } from "./model";
import { listTeachers, saveTeacher } from "./api";
import type { Teacher } from "./model";
import "../people.css";

/**
 * Vista de profesores con su rejilla o lista y el detalle de la ficha.
 * @param props - Proyecto, permisos, tareas y alumnos para las asignaciones.
 * @returns La vista completa de profesores.
 */
export default function TeachersView({ projectId, isAdmin, canTools, ownTeacherId, tasks, students, openTask }: { projectId: string; isAdmin: boolean; canTools: boolean; ownTeacherId: string | null; tasks: Task[] | null; students: Student[] | null; openTask: (task: Task) => void }) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Teacher | null>(null);
  const [removing, setRemoving] = useState<Teacher | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<"miembros" | "herramientas">("miembros");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setTeachers(await listTeachers(projectId)); setError(""); }
    catch (caught) { setError((caught as Error).message); }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    listTeachers(projectId)
      .then((items) => { if (active) { setTeachers(items); setError(""); } })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    const interval = window.setInterval(() => { void load(); }, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [projectId, load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true); setError("");
    try {
      const { id, name, displayName, role, activities, aiHelp, revision } = form;
      const saved = await saveTeacher(projectId, revision ? "PATCH" : "POST", { id, name, displayName, role, activities, aiHelp, accountEmail: form.accountEmail ?? "", ...(revision ? { revision } : {}) });
      setForm(null); setSelected(saved.id); await load();
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!removing || busy) return;
    setBusy(true); setError("");
    try {
      await saveTeacher(projectId, "DELETE", { id: removing.id, revision: removing.revision });
      setRemoving(null); setSelected(null); await load();
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  }

  const teacher = teachers?.find((item) => item.id === selected);
  const allPeople: Student[] = [...(students ?? []), ...(teachers ?? []).map(item => ({ section: item.id, name: item.name, displayName: item.displayName || item.name, role: item.role, activities: item.activities, aiHelp: item.aiHelp, revision: item.revision }))];
  const teacherAsStudent = allPeople.find((person) => person.section === teacher?.id);
  const assigned = teacherAsStudent && students !== null ? (tasks ?? []).filter(task => task.assignees?.length ? task.assignees.some(person => person.kind === "teacher" && person.profileId === teacher?.id) : taskBelongsTo(task, teacherAsStudent, allPeople)) : [];

  const isEmpty = teachers !== null && teachers.length === 0;

  return <section className="students-view">
    <div className="students-heading"><div className="students-title-row"><h2>Profesores</h2>{isAdmin && <button className="primary add-student" type="button" title="Añadir profesor" aria-label="Añadir profesor" onClick={() => { setError(""); setForm(blankTeacher()); }}><Plus size={20} /></button>}</div>{canTools && <div className="people-tabs" role="group" aria-label="Vistas de profesores"><button type="button" className="people-tab" aria-current={tab === "miembros" ? "page" : undefined} onClick={() => setTab("miembros")}><Users size={16} aria-hidden /> Miembros</button><button type="button" className="people-tab" aria-current={tab === "herramientas" ? "page" : undefined} onClick={() => setTab("herramientas")}><Wrench size={16} aria-hidden /> Herramientas</button></div>}</div>
    {tab === "herramientas" && canTools ? (<BooksToolsPanel projectId={projectId} />) : (<>
    {error && !form && !removing && <div className="alert" role="alert">{error} <button className="text-button" onClick={() => void load()}>Reintentar</button></div>}
    {selected ? teacher ? <ProfileDetail
      kicker="Ficha de profesor"
      backLabel="Todos los profesores"
      person={{ name: teacher.displayName || teacher.name, role: teacher.role, activities: teacher.activities, aiHelp: teacher.aiHelp, accountStatus: teacher.accountStatus }}
      canEdit={isAdmin || ownTeacherId === teacher.id}
      onBack={() => setSelected(null)}
      onEdit={() => { setError(""); setForm(teacher); }}
      onRemove={() => { setError(""); setRemoving(teacher); }}
      tasks={assigned}
      loading={tasks === null || students === null}
      onOpenTask={openTask}
    /> : <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => setSelected(null)}>← Todos los profesores</button></div> : isEmpty ? (
      error ? null : <PeopleEmptyState
        icon={GraduationCap}
        title="Aún no hay profesores"
        description={isAdmin ? "Añade la primera ficha del equipo docente." : "Cuando la administración añada la primera ficha, aparecerá aquí."}
        action={isAdmin ? { label: "Añadir profesor", onClick: () => { setError(""); setForm(blankTeacher()); } } : undefined}
      />
    ) : <>
      <LayoutToggle count={teachers?.length ?? 0} unit="profesores" ariaLabel="Seleccionar vista de profesores" layout={layout} onLayout={setLayout} />
      <div className={layout === "grid" ? "students-grid" : "students-grid students-list"}>
        {teachers === null ? <p>Cargando fichas…</p> : teachers.map(item => <ProfileCard key={item.id} name={item.displayName || item.name} role={item.role} accountStatus={item.accountStatus} onOpen={() => setSelected(item.id)} />)}
      </div>
    </>}
    {form && <TeacherFormDialog teacher={form} onChange={setForm} error={error} busy={busy} onSubmit={save} onClose={() => setForm(null)} />}
    {removing && <TeacherDeleteDialog teacher={removing} error={error} busy={busy} onClose={() => setRemoving(null)} onConfirm={() => void remove()} />}
    </>)}
  </section>;
}
