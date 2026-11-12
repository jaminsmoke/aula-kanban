"use client";

import { useCallback, useRef, useState } from "react";
import type { FormEvent } from "react";
import { personLabel, taskBelongsTo } from "../assignments";
import type { Task, TaskAssignee, TaskFields } from "../task";
import { blank, columns } from "./model";
import { request } from "./api";
import type { BoardData } from "./use-board-data";
import type { GripEvent } from "./task-card";

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
  const drag = useRef<{ task: Task; x: number; y: number; started: boolean } | null>(null);

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
    setForm((current) => ({ ...current, assignees: linked, assignee: linked.length ? linked.map((person) => person.name).join(", ") : current.assignee }));
  }

  function addAssignee() {
    setForm((current) => ({ ...current, assignees: [...current.assignees, { kind: "student", profileId: "", name: "" }] }));
  }

  function removeAssignee(index: number) {
    setForm((current) => ({ ...current, assignees: current.assignees.filter((_, position) => position !== index) }));
  }

  function chooseAssignee(index: number, value: string) {
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
    const task = editor?.task;
    const values = { ...form, assignees: form.assignees.filter((person) => person.profileId) };
    if (task) {
      void mutate("PATCH", { id: task.id, revision: task.revision, changes: values }, "Cambios guardados.", true);
    } else {
      void mutate("POST", values, "Tarea creada.", true);
    }
  }

  function laneAt(event: GripEvent) {
    const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-lane]");
    return (lane?.dataset.lane as TaskFields["status"] | undefined) ?? null;
  }

  function grab(event: GripEvent, task: Task) {
    if (!event.isPrimary || event.button !== 0 || writingRef.current) return;
    if (!canManage && !ownsTask(task)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { task, x: event.clientX, y: event.clientY, started: false };
  }

  function move(event: GripEvent) {
    const current = drag.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (!current.started && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.started = true;
    setDragged(current.task.id);
    const status = laneAt(event);
    setDestination(status === current.task.status ? null : status);
  }

  function cancelDrag() {
    drag.current = null;
    setDestination(null);
    setDragged(null);
  }

  function release(event: GripEvent) {
    const current = drag.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const status = laneAt(event);
    cancelDrag();
    if (current.started && status && current.task.status !== status) {
      const { id, revision } = current.task;
      void mutate("PATCH", { id, revision, changes: { status } }, `Tarea movida a «${columns[status].name}».`, false);
    }
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
  const claiming = Boolean(editor?.task && !canManage && !editor.task.assignees.length && unassigned(editor.task.assignee));

  return {
    search, setSearch, filter, setFilter, studentFilter, setStudentFilter, clearStudentFilter,
    editor, setEditor, form, setForm, deleting, setDeleting, saving, formError,
    dragged, destination, openEditor, mutate, submit, grab, move, cancelDrag, release,
    addAssignee, removeAssignee, chooseAssignee, assignWholeClass,
    canEditTask, claiming, visible, filtered, total, finished, progress,
  };
}
