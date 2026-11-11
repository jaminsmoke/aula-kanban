import type { Student } from "./student";
import type { Task } from "./task";

export function normalizeName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function taskBelongsTo(task: Pick<Task, "assignee">, student: Student, students: Student[]) {
  const assignee = normalizeName(task.assignee);
  if (!assignee) return false;
  const matches = students.filter((item) => {
    const first = item.name.split(/\s+/)[0];
    const uniqueFirst = students.filter((other) => normalizeName(other.name.split(/\s+/)[0]) === normalizeName(first)).length === 1;
    return assignee === normalizeName(item.name) || assignee === normalizeName(item.displayName) || (uniqueFirst && assignee === normalizeName(first));
  });
  return matches.length === 1 && matches[0].section === student.section;
}
