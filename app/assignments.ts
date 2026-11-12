import type { Student } from "./student";
import type { Task } from "./task";

export function personLabel(person: { name: string; displayName?: string }) {
  return person.displayName?.trim() || person.name.trim() || "Sin nombre";
}

export function normalizeName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function taskBelongsTo(task: Pick<Task, "assignee"> & Partial<Pick<Task, "assignees">>, student: Student, students: Student[]) {
  if (task.assignees) return task.assignees.some(person => person.kind === "student" && person.profileId === student.section);
  const assignee = normalizeName(task.assignee);
  if (!assignee) return false;
  const matches = students.filter((item) => {
    const first = item.name.split(/\s+/)[0];
    const uniqueFirst = students.filter((other) => normalizeName(other.name.split(/\s+/)[0]) === normalizeName(first)).length === 1;
    return assignee === normalizeName(item.name) || assignee === normalizeName(item.displayName) || (uniqueFirst && assignee === normalizeName(first));
  });
  return matches.length === 1 && matches[0].section === student.section;
}
