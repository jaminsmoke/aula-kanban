"use client";

import { Plus } from "lucide-react";
import type { Task } from "../../../../lib/domain/task";
import type { Student } from "../../../../lib/domain/student";
import { taskBelongsTo } from "../../../../lib/domain/assignments";
import LayoutToggle from "../../layout/layout-toggle";
import ProfileCard from "../profile-card";
import ProfileDetail from "../profile-detail";
import "../people.css";

/**
 * Vista de alumnos con su rejilla o lista y el detalle de la ficha.
 * @param props - Alumnos, tareas, selección, vista y acciones de gestión.
 * @returns La vista completa de alumnos.
 */
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
  const student = studentName ? students?.find((item) => item.section === studentName) : undefined;
  return (
    <section className="students-view">
      <div className="students-heading">
        <div className="students-title-row">
          <h2>Alumnos</h2>
          {canManage && <button type="button" className="primary add-student" aria-label="Añadir alumno" title="Añadir alumno" onClick={onCreate}><Plus size={20} aria-hidden /></button>}
        </div>
      </div>
      {loadError && <div role="alert" className="alert">{loadError} <button type="button" className="text-button" onClick={onRetryTasks}>Reintentar</button></div>}
      {studentError && <div role="alert" className="alert">{studentError} <button type="button" className="text-button" onClick={onRetryStudents}>Reintentar</button></div>}
      {studentName ? (() => {
        if (!student) return <div className="student-detail"><p>Esta ficha ya no está disponible.</p><button className="text-button back-link" onClick={() => onSelectStudent(null)}>← Todos los alumnos</button></div>;
        const assigned = students === null ? [] : all.filter((task) => taskBelongsTo(task, student, allPeople));
        return <ProfileDetail
          kicker="Ficha de alumno"
          backLabel="Todos los alumnos"
          person={{ name: student.displayName || student.name, role: student.role, activities: student.activities, aiHelp: student.aiHelp, accountStatus: student.accountStatus }}
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
          {students?.map((item) => <ProfileCard key={item.section} name={item.displayName || item.name} role={item.role} accountStatus={item.accountStatus} onOpen={() => onSelectStudent(item.section)} />)}
        </div>
      </>}
    </section>
  );
}
