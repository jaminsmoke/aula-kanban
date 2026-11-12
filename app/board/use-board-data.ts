"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Student } from "../student";
import type { Task } from "../task";
import type { Project } from "./model";
import { request } from "./api";

export type BoardData = ReturnType<typeof useBoardData>;

/** Datos del tablero activo: tareas, fichas de alumnos y profesores, con sondeo. */
export function useBoardData(activeProject?: Project) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [teachers, setTeachers] = useState<{ id: string; name: string; displayName: string }[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [studentError, setStudentError] = useState("");
  const taskVersion = useRef(0);
  const peopleVersion = useRef(0);
  const writingRef = useRef(false);
  const studentWritingRef = useRef(false);
  const activeProjectId = activeProject?.id;

  const refresh = useCallback(async () => {
    if (writingRef.current) return;
    const version = ++taskVersion.current;
    try {
      const next = await request<Task[]>();
      if (version !== taskVersion.current) return;
      setTasks(next);
      setLoadError("");
    } catch (error) {
      if (version === taskVersion.current) setLoadError((error as Error).message);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    if (studentWritingRef.current) return;
    const version = ++peopleVersion.current;
    try {
      const next = await request<Student[]>("GET", undefined, "/api/students");
      if (version !== peopleVersion.current) return;
      setStudents(next);
      setStudentError("");
    } catch (error) {
      if (version === peopleVersion.current) setStudentError((error as Error).message);
    }
  }, []);

  const refreshTeachers = useCallback(async () => {
    try { setTeachers(await request<{ id: string; name: string; displayName: string }[]>("GET", undefined, "/api/teachers")); }
    catch { setTeachers(null); }
  }, []);

  const invalidateTasks = useCallback(() => { ++taskVersion.current; }, []);
  const invalidateStudents = useCallback(() => { ++peopleVersion.current; }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    let active = true;
    const taskLoad = ++taskVersion.current;
    const peopleLoad = ++peopleVersion.current;
    request<Task[]>().then(
      (next) => { if (active && taskLoad === taskVersion.current) { setTasks(next); setLoadError(""); } },
      (error) => { if (active && taskLoad === taskVersion.current) setLoadError((error as Error).message); },
    );
    request<Student[]>("GET", undefined, "/api/students").then(
      (next) => { if (active && peopleLoad === peopleVersion.current) { setStudents(next); setStudentError(""); } },
      (error) => { if (active && peopleLoad === peopleVersion.current) setStudentError((error as Error).message); },
    );
    request<{ id: string; name: string; displayName: string }[]>("GET", undefined, "/api/teachers").then(
      (next) => { if (active) setTeachers(next); },
      () => { if (active) setTeachers(null); },
    );
    const timer = window.setInterval(() => { if (!document.hidden) { void refresh(); void refreshStudents(); void refreshTeachers(); } }, 8000);
    const onFocus = () => { void refresh(); void refreshStudents(); void refreshTeachers(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeProjectId, refresh, refreshStudents, refreshTeachers]);

  const ownStudent = students?.find((student) => student.section === activeProject?.studentSection);
  const allPeople: Student[] = [
    ...(students ?? []).map((student) => ({ ...student, displayName: student.displayName || student.name })),
    ...(teachers ?? []).map((teacher) => ({ section: teacher.id, name: teacher.name, displayName: teacher.displayName || teacher.name, role: "", activities: "", aiHelp: "", revision: 1 })),
  ];

  return {
    tasks, setTasks, students, setStudents, teachers, loadError, studentError,
    refresh, refreshStudents, refreshTeachers, invalidateTasks, invalidateStudents,
    writingRef, studentWritingRef, ownStudent, allPeople,
  };
}
