"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { Student } from "../student";
import { request } from "./api";
import type { BoardData } from "./use-board-data";

export function useStudents({ data, openStudent, onStudentRemoved, notify }: {
  data: BoardData;
  openStudent: (section: string | null) => void;
  onStudentRemoved: (section: string) => void;
  notify: (message: string) => void;
}) {
  const { setStudents, refreshStudents, studentWritingRef, invalidateStudents } = data;
  const [studentForm, setStudentForm] = useState<Student | null>(null);
  const [studentFormError, setStudentFormError] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentDeleting, setStudentDeleting] = useState<Student | null>(null);

  function openNewStudent() {
    setStudentForm({ section: crypto.randomUUID(), name: "", displayName: "", role: "", activities: "", aiHelp: "", revision: 0, accountEmail: "" });
    setStudentFormError("");
  }

  function openEditStudent(student: Student) {
    setStudentForm(student);
    setStudentFormError("");
  }

  function openRemoveStudent(student: Student) {
    setStudentDeleting(student);
    setStudentFormError("");
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentForm || studentWritingRef.current) return;
    studentWritingRef.current = true;
    invalidateStudents();
    setStudentSaving(true);
    setStudentFormError("");
    try {
      const isNew = studentForm.revision === 0;
      const updated = await request<Student>(isNew ? "POST" : "PATCH", studentForm, "/api/students");
      setStudents((previous) => isNew ? [...(previous ?? []), updated] : previous?.map((student) => student.section === updated.section ? updated : student) ?? [updated]);
      if (isNew) openStudent(updated.section);
      setStudentForm(null);
      notify(isNew ? "Alumno añadido." : "Perfil actualizado.");
    } catch (error) {
      setStudentFormError((error as Error).message);
    } finally {
      studentWritingRef.current = false;
      setStudentSaving(false);
      void refreshStudents();
    }
  }

  async function deleteStudent() {
    if (!studentDeleting || studentWritingRef.current) return;
    studentWritingRef.current = true;
    invalidateStudents();
    setStudentSaving(true);
    setStudentFormError("");
    try {
      await request<Student>("DELETE", { section: studentDeleting.section, revision: studentDeleting.revision }, "/api/students");
      setStudents((previous) => previous?.filter((student) => student.section !== studentDeleting.section) ?? []);
      onStudentRemoved(studentDeleting.section);
      openStudent(null);
      setStudentDeleting(null);
      notify("Perfil eliminado.");
    } catch (error) {
      setStudentFormError((error as Error).message);
    } finally {
      studentWritingRef.current = false;
      setStudentSaving(false);
      void refreshStudents();
    }
  }

  return {
    studentForm, setStudentForm, studentFormError, studentSaving, studentDeleting, setStudentDeleting,
    openNewStudent, openEditStudent, openRemoveStudent, saveStudent, deleteStudent,
  };
}
