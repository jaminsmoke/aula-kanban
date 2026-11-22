"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { personLabel, taskBelongsTo } from "../../../lib/domain/assignments";
import type { Task, TaskAssignee, TaskFields } from "../../../lib/domain/task";
import { blank, columns } from "../shared/model";
import { request } from "../shared/api";
import type { BoardData } from "../shared/use-board-data";
import { canClaimTask, claimChanges } from "./claim";
import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from "@dnd-kit/core";

/**
 * Estado del tablero de tareas: filtros, editor, responsables y arrastre.
 * @param props - Datos del tablero, permisos y avisos.
 * @returns Filtros, editor, tareas visibles, progreso y acciones.
 */
export function useTasks({ data, hasProject, canManage, isGuest, notify }: {
  data: BoardData;
  hasProject: boolean;
  canManage: boolean;
  isGuest: boolean;
  notify: (message: string) => void;
}) {
  const { tasks, setTasks, students, teachers, allPeople, ownStudent, refresh, writingRef, invalidateTasks } = data;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [editor, setEditor] = useState<{ task?: Task; status: TaskFields["status"] } | null>(null);
  const [form, setForm] = useState<TaskFields>(blank);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [destination, setDestination] = useState<TaskFields["status"] | null>(null);

  const ownsTask = useCallback((task: Task) => Boolean(
    ownStudent && task.assignees?.length === 1 && task.assignees.some((person) => person.kind === "student" && person.profileId === ownStudent.section),
  ), [ownStudent]);

  function unassigned(name: string) {
    return !name.trim() || name.trim().toLocaleLowerCase("es") === "por definir";
  }

  function canEditTask(task: Task) {
    return Boolean(!isGuest && (canManage || (ownStudent && (task.assignees.length === 0 && unassigned(task.assignee) || ownsTask(task)))));
  }

  const assigneeOptions: TaskAssignee[] = [
    ...(students ?? []).map((student) => ({ kind: "student" as const, profileId: student.section, name: personLabel(student) })),
    ...(teachers ?? []).map((teacher) => ({ kind: "teacher" as const, profileId: teacher.id, name: personLabel(teacher) })),
  ];

  function storeAssignees(next: TaskAssignee[]) {
    const linked = next.filter((person) => person.profileId);
    setForm((current) => ({ ...current, assignees: linked, assignee: linked.length ? linked.map((person) => person.name).join(", ") : "" }));
  }

  function addAssignee() {
    setForm((current) => ({ ...current, assignees: [...current.assignees, { kind: "student", profileId: "", name: "" }] }));
  }

  function removeAssignee(index: number) {
    storeAssignees(form.assignees.filter((_, position) => position !== index));
  }

  function chooseAssignee(index: number, value: string) {
    if (!value) {
      storeAssignees(form.assignees.map((item, position) => position === index ? { ...item, profileId: "", name: "" } : item));
      return;
    }
    const person = assigneeOptions.find((option) => `${option.kind}:${option.profileId}` === value);
    if (!person) return;
    storeAssignees(form.assignees.map((item, position) => position === index ? person : item));
  }

  function assignWholeClass() {
    const classPeople = assigneeOptions.filter((person) => person.kind === "student");
    const merged = [
      ...form.assignees.filter((person) => person.profileId),
      ...classPeople.filter((person) => !form.assignees.some((item) => item.kind === person.kind && item.profileId === person.profileId)),
    ];
    storeAssignees(merged);
  }

  function removeWholeClass() {
    storeAssignees(form.assignees.filter((person) => person.kind !== "student"));
  }

  function openEditor(status: TaskFields["status"], task?: Task) {
    if (writingRef.current) return;
    if (!hasProject || (!task && isGuest)) return;
    setForm(task ?? { ...blank, status });
    setFormError("");
    setDeleting(false);
    setEditor({ task, status });
  }

  async function mutate(method: string, body: unknown, message: string, fromEditor: boolean) {
    if (writingRef.current) return;
    writingRef.current = true;
    invalidateTasks();
    setSaving(true);
    setFormError("");
    notify("");
    try {
      const result = await request<Task>(method, body);
      setTasks((previous) => {
        const others = (previous ?? []).filter((task) => task.id !== result.id);
        return method === "DELETE" ? others : [...others, result].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
      });
      if (fromEditor) setEditor(null);
      notify(message);
    } catch (error) {
      if (fromEditor) setFormError((error as Error).message);
      else notify((error as Error).message);
    } finally {
      writingRef.current = false;
      setSaving(false);
      void refresh();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError("Escribe un título para la tarea.");
      return;
    }
    const emptyIndex = form.assignees.findIndex((person) => !person.profileId);
    if (emptyIndex >= 0) {
      setFormError(`Elige o quita el responsable ${emptyIndex + 1}.`);
      return;
    }
    const task = editor?.task;
    const values = { ...form, assignees: form.assignees.filter((person) => person.profileId) };
    if (task) {
      void mutate("PATCH", { id: task.id, revision: task.revision, changes: values }, "Cambios guardados.", true);
    } else {
      void mutate("POST", values, "Tarea creada.", true);
    }
  }

  function statusOf(id: UniqueIdentifier | null | undefined) {
    if (typeof id === "string" && id.startsWith("lane:")) return id.slice(5) as TaskFields["status"];
    return (tasks ?? []).find((task) => task.id === id)?.status ?? null;
  }

  function canGrabTask(task: Task) {
    return Boolean(canManage || ownsTask(task));
  }

  function handleDragStart(event: DragStartEvent) {
    setDragged(String(event.active.id));
    setDestination(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const active = (tasks ?? []).find((task) => task.id === event.active.id);
    if (!active) return;
    const status = statusOf(event.over?.id ?? null);
    setDestination(status && status !== active.status ? status : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = (tasks ?? []).find((task) => task.id === event.active.id);
    const status = event.over ? statusOf(event.over.id) : null;
    setDragged(null);
    setDestination(null);
    if (active && status && status !== active.status) {
      const { id, revision } = active;
      void mutate("PATCH", { id, revision, changes: { status } }, "Tarea movida a «" + columns[status].name + "».", false);
    }
  }

  /**
   * Asigna la tarea libre a la ficha propia con la revisión actual.
   * @returns Nada; el resultado se anuncia y la ficha se cierra al guardar.
   */
  async function claimTask() {
    const task = editor?.task;
    if (!task || !ownStudent || !canClaimTask({ task, ownStudent, canManage, isGuest })) return;
    await mutate("PATCH", claimChanges(task, ownStudent), "Tarea asignada.", true);
  }

  function handleDragCancel() {
    setDragged(null);
    setDestination(null);
  }
  const clearStudentFilter = useCallback((section: string) => {
    setStudentFilter((current) => current === section ? "" : current);
  }, []);

  const all = tasks ?? [];
  const total = all.length;
  const finished = all.filter((task) => task.status === "done").length;
  const progress = total ? Math.round(finished / total * 100) : 0;
  const query = search.trim().toLocaleLowerCase("es");
  const selectedStudent = students?.find((student) => student.section === studentFilter);
  const visible = all.filter((task) => {
    const haystack = [task.title, task.description, task.assignee].join(" ").toLocaleLowerCase("es");
    const matchesStudent = Boolean(selectedStudent && teachers !== null && taskBelongsTo(task, selectedStudent, allPeople));
    return (!filter || task.priority === filter) && haystack.includes(query) && (!studentFilter || matchesStudent);
  });
  const filtered = Boolean(query || filter || studentFilter);
  const claiming = canClaimTask({ task: editor?.task, ownStudent, canManage, isGuest });

  return {
    search, setSearch, filter, setFilter, studentFilter, setStudentFilter, clearStudentFilter,
    editor, setEditor, form, setForm, deleting, setDeleting, saving, formError,
    dragged, destination, openEditor, mutate, submit, claimTask, canGrabTask, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel,
    addAssignee, removeAssignee, chooseAssignee, assignWholeClass, removeWholeClass,
    canEditTask, claiming, visible, filtered, total, finished, progress,
  };
}
