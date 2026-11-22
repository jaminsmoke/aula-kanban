import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useTasks } from "./use-tasks";
import type { BoardData } from "../shared/use-board-data";
import type { Task } from "../../../lib/domain/task";
import { jsonResponse } from "../../../vitest.setup";

const student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 1,
};

const task = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  title: "Investigar placas",
  description: "",
  imageUrl: "",
  assignee: "",
  assignees: [],
  dueDate: "",
  priority: "normal" as const,
  status: "pending" as const,
  createdAt: 1,
  revision: 0,
  ...overrides,
});

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    tasks: [],
    setTasks: vi.fn(),
    students: [],
    setStudents: vi.fn(),
    teachers: [],
    loadError: "",
    studentError: "",
    refresh: vi.fn(async () => {}),
    refreshStudents: vi.fn(async () => {}),
    refreshTeachers: vi.fn(async () => {}),
    invalidateTasks: vi.fn(),
    invalidateStudents: vi.fn(),
    writingRef: { current: false },
    studentWritingRef: { current: false },
    ownStudent: undefined,
    allPeople: [],
    ...overrides,
  } as unknown as BoardData;
}

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

describe("useTasks", () => {
  it("filtra por texto, prioridad y alumno asignado", () => {
    const data = makeData({
      tasks: [
        task({ id: "t1", title: "Investigar placas", priority: "high", assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] }),
        task({ id: "t2", title: "Preparar exposición", priority: "low" }),
        task({ id: "t3", title: "Investigar sensores", priority: "high" }),
      ],
      students: [student],
    });

    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.setSearch("investigar"));
    expect(result.current.visible.map((item) => item.id)).toEqual(["t1", "t3"]);

    act(() => result.current.setFilter("high"));
    expect(result.current.visible.map((item) => item.id)).toEqual(["t1", "t3"]);

    act(() => result.current.setSearch(""));
    act(() => result.current.setStudentFilter("s1"));
    expect(result.current.visible.map((item) => item.id)).toEqual(["t1"]);
    expect(result.current.filtered).toBe(true);
  });

  it("busca sin tildes y limpia búsqueda, prioridad y alumno", () => {
    const data = makeData({
      tasks: [
        task({ id: "t1", title: "Geometría", priority: "high" }),
        task({ id: "t2", title: "Investigación de placas", priority: "low" }),
      ],
      students: [student],
    });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.setSearch("geometria"));
    expect(result.current.visible.map((item) => item.id)).toEqual(["t1"]);

    act(() => result.current.setSearch("INVESTIGACIÓN"));
    expect(result.current.visible.map((item) => item.id)).toEqual(["t2"]);

    act(() => result.current.setSearch("investigacion"));
    act(() => result.current.setFilter("low"));
    act(() => result.current.setStudentFilter("s1"));
    act(() => result.current.clearFilters());

    expect(result.current.search).toBe("");
    expect(result.current.filter).toBe("");
    expect(result.current.studentFilter).toBe("");
    expect(result.current.filtered).toBe(false);
  });

  it("conserva la búsqueda, prioridad y alumno al abrir la ficha editable", () => {
    const data = makeData({
      tasks: [task({ id: "t1", title: "Investigar placas", priority: "high", assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] })],
      students: [student],
    });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.setSearch("investigar"));
    act(() => result.current.setFilter("high"));
    act(() => result.current.setStudentFilter("s1"));
    act(() => result.current.openEditor("pending", data.tasks?.[0]));

    expect(result.current.search).toBe("investigar");
    expect(result.current.filter).toBe("high");
    expect(result.current.studentFilter).toBe("s1");
    expect(result.current.editor?.task?.id).toBe("t1");
    expect(result.current.visible.map((item) => item.id)).toEqual(["t1"]);
  });

  it("desactiva la reclamación para docentes, invitados y cuentas sin ficha", () => {
    const free = task() as Task;
    const cases = [
      { label: "docente", props: { canManage: true, isGuest: false }, data: makeData({ ownStudent: student }) },
      { label: "invitado", props: { canManage: false, isGuest: true }, data: makeData({ ownStudent: student }) },
      { label: "sin ficha", props: { canManage: false, isGuest: false }, data: makeData() },
    ];

    for (const item of cases) {
      const { result } = renderHook(() => useTasks({ data: item.data, hasProject: true, ...item.props, notify: vi.fn() }));
      act(() => result.current.openEditor("pending", free));
      expect(result.current.claiming, item.label).toBe(false);
    }
  });

  it("no envía una reclamación sin ficha propia", async () => {
    const free = task() as Task;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useTasks({ data: makeData(), hasProject: true, canManage: false, isGuest: false, notify: vi.fn() }));

    act(() => result.current.openEditor("pending", free));
    await act(async () => result.current.claimTask());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asigna la tarea libre a la ficha propia con la revisión actual", async () => {
    const updated = task({
      assignee: "Ada",
      assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
    });
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(updated));
    vi.stubGlobal("fetch", fetchMock);
    const notify = vi.fn();
    const data = makeData({ ownStudent: student });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: false, isGuest: false, notify }));

    act(() => result.current.openEditor("pending", task() as Task));
    expect(result.current.claiming).toBe(true);
    await act(async () => result.current.claimTask());

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      id: "t1",
      revision: 0,
      changes: {
        title: "Investigar placas",
        assignee: "Ada",
        assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
      },
    });
    expect(notify).toHaveBeenCalledWith("Tarea asignada.");
    expect(result.current.editor).toBeNull();
  });

  it("mantiene la ficha y muestra el aviso si la tarea cambió al reclamarla", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: "Esta tarea cambió en otra sesión." }, false, 409));
    vi.stubGlobal("fetch", fetchMock);
    const data = makeData({ ownStudent: student });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: false, isGuest: false, notify: vi.fn() }));

    act(() => result.current.openEditor("pending", task() as Task));
    await act(async () => result.current.claimTask());

    expect(result.current.editor?.task?.id).toBe("t1");
    expect(result.current.formError).toBe("Esta tarea cambió en otra sesión.");
  });

  it("crea la tarea desde el editor", async () => {
    const created = task({ id: "t9", title: "Nueva tarea" });
    const fetchMock = vi.fn(async () => jsonResponse(created));
    vi.stubGlobal("fetch", fetchMock);
    const setTasks = vi.fn();
    const notify = vi.fn();
    const data = makeData({ setTasks });

    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify }));

    act(() => result.current.openEditor("pending"));
    act(() => result.current.setForm({ ...result.current.form, title: "Nueva tarea" }));
    await act(async () => result.current.submit(submitEvent()));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("Tarea creada."));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks?project=default",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.editor).toBeNull();
    const updater = setTasks.mock.calls[0][0] as (previous: unknown[]) => unknown[];
    expect(updater([])).toEqual([created]);
  });

  it("asigna toda la clase y bloquea las filas vacías al guardar", async () => {
    const created = task({ id: "t10", title: "Tarea de clase" });
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(created));
    vi.stubGlobal("fetch", fetchMock);
    const data = makeData({ students: [student, { ...student, section: "s2", name: "Grace", displayName: "Grace" }] });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.openEditor("pending"));
    act(() => result.current.setForm((current) => ({ ...current, title: "Tarea de clase" })));
    act(() => result.current.assignWholeClass());
    expect(result.current.form.assignees).toHaveLength(2);
    expect(result.current.form.assignee).toBe("Ada, Grace");

    act(() => result.current.addAssignee());
    expect(result.current.form.assignees).toHaveLength(3);
    await act(async () => result.current.submit(submitEvent()));

    expect(result.current.formError).toBe("Elige o quita el responsable 3.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limpia el texto libre al quitar el último responsable y permite quitar la clase", () => {
    const data = makeData({ students: [student, { ...student, section: "s2", name: "Grace", displayName: "Grace" }] });
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.openEditor("pending"));
    act(() => result.current.setForm((current) => ({ ...current, assignees: [{ kind: "student", profileId: "s1", name: "Ada" }], assignee: "Ada" })));
    act(() => result.current.removeAssignee(0));
    expect(result.current.form.assignees).toEqual([]);
    expect(result.current.form.assignee).toBe("");

    act(() => result.current.setForm((current) => ({ ...current, assignees: [{ kind: "student", profileId: "s1", name: "Ada" }, { kind: "teacher", profileId: "teacher-1", name: "Marta" }], assignee: "Ada, Marta" })));
    act(() => result.current.removeWholeClass());
    expect(result.current.form.assignees).toEqual([{ kind: "teacher", profileId: "teacher-1", name: "Marta" }]);
  });

  it("no envía la tarea sin título", () => {
    const data = makeData();
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));

    act(() => result.current.openEditor("pending"));
    act(() => result.current.submit(submitEvent()));

    expect(result.current.formError).toBe("Escribe un título para la tarea.");
  });

  it("bloquea el editor para invitados", () => {
    const data = makeData();
    const { result } = renderHook(() => useTasks({ data, hasProject: true, canManage: false, isGuest: true, notify: vi.fn() }));

    act(() => result.current.openEditor("pending"));

    expect(result.current.editor).toBeNull();
  });

  it("deja editar al docente y limita al alumno a sus tareas o a las libres", () => {
    const own = task({ id: "own", assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] });
    const other = task({ id: "other", assignees: [{ kind: "student", profileId: "s2", name: "Grace" }] });
    const free = task({ id: "free", assignee: "", assignees: [] });

    const teacher = renderHook(() => useTasks({ data: makeData(), hasProject: true, canManage: true, isGuest: false, notify: vi.fn() }));
    expect(teacher.result.current.canEditTask(own)).toBe(true);
    expect(teacher.result.current.canEditTask(other)).toBe(true);

    const studentView = renderHook(() => useTasks({ data: makeData({ ownStudent: student }), hasProject: true, canManage: false, isGuest: false, notify: vi.fn() }));
    expect(studentView.result.current.canEditTask(own)).toBe(true);
    expect(studentView.result.current.canEditTask(other)).toBe(false);
    expect(studentView.result.current.canEditTask(free)).toBe(true);
  });
});
