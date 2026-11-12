"use client";

import { Plus } from "lucide-react";
import type { Task } from "../task";
import type { Student } from "../student";
import { taskBelongsTo } from "../assignments";
import LayoutToggle from "./layout-toggle";
import ProfileCard from "./profile-card";
import ProfileDetail from "./profile-detail";

export default function StudentsView({
  students, tasks, all, allPeople, ownStudent, canManage, loadError, studentError, onRetryTasks, onRetryStudents,
  studentName, onSelectStudent, layout, onLayout, onCreate, onEdit, onDelete, onOpenTask,
}: {
  students: Student[] | null;
  tasks: Task[] | null;
  all: Task[];
  allPeople: Student[];
  ownStudent?: Student;
  canManage: boolean;
  loadError: string;
  studentError: string;
  onRetryTasks: () => void;
  onRetryStudents: () => void;
  studentName: string | null;
  onSelectStudent: (section: string | null) => void;
  layout: "grid" | "list";
  onLayout: (layout: "grid" | "list") => void;
  onCreate: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onOpenTask: (task: Task) => void;
}) {
  const matchingStudent = (student: Student) => ({ ...student, displayName: student.name });

  const student = studentName ? students?.find((item) => item.section === studentName) : undefined;
  return (
    <section className="students-view">
      <p className="eyebrow"><span /> Grupo de clase</p>
      <div className="students-heading">
        <div className="students-title-row">
          <h1>Alumnos</h1>
          {canManage && <button type="button" className="primary add-student" aria-label="Añadir alumno" title="Añadir alumno" onClick={onCreate}><Plus size={20} aria-hidden /></button>}
        </div>
        <p className="intro">Fichas del grupo y tareas asignadas.</p>
      </div>
      {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={onRetryTasks}>Reintentar</button></div>}
      {studentError && <div role="alert" className="alert">{studentError} <button type="button" className="text-button" onClick={onRetryStudents}>Reintentar</button></div>}
      {studentName ? (() => {
        if (!student) return <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => onSelectStudent(null)}>← Todos los alumnos</button></div>;
        const assigned = students === null ? [] : all.filter((task) => taskBelongsTo(task, matchingStudent(student), allPeople));
        return <ProfileDetail
          kicker="Ficha de alumno"
          backLabel="Todos los alumnos"
          person={{ name: student.displayName, role: student.role, activities: student.activities, aiHelp: student.aiHelp, accountStatus: student.accountStatus }}
          canEdit={Boolean(canManage || ownStudent?.section === student.section)}
          onBack={() => onSelectStudent(null)}
          onEdit={() => onEdit(student)}
          onRemove={() => onDelete(student)}
          tasks={assigned}
          loading={tasks === null}
          onOpenTask={onOpenTask}
        />;
      })() : <>
        <LayoutToggle count={students?.length ?? 0} unit="alumnos" ariaLabel="Seleccionar vista de alumnos" layout={layout} onLayout={onLayout} />
        <div className={layout === "grid" ? "students-grid" : "students-grid students-list"}>
          {students === null && <p>{studentError ? "No se pudieron cargar las fichas." : "Cargando fichas…"}</p>}
          {students?.map((item) => <ProfileCard key={item.section} name={item.displayName} role={item.role} accountStatus={item.accountStatus} onOpen={() => onSelectStudent(item.section)} />)}
        </div>
      </>}
    </section>
  );
}
