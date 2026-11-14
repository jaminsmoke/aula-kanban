import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { useStudents } from "./use-students";
import type { BoardData } from "../shared/use-board-data";
import { jsonResponse } from "../../../vitest.setup";

const student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 2,
  accountEmail: "",
};

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    tasks: [],
    setTasks: vi.fn(),
    students: [student],
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

describe("useStudents", () => {
  it("abre una ficha nueva con revisión cero", () => {
    const { result } = renderHook(() => useStudents({ data: makeData(), openStudent: vi.fn(), onStudentRemoved: vi.fn(), notify: vi.fn() }));

    act(() => result.current.openNewStudent());

    expect(result.current.studentForm).toMatchObject({ name: "", revision: 0 });
    expect(result.current.studentForm?.section).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("guarda una ficha nueva y abre su detalle", async () => {
    const saved = { ...student, section: "s-new", name: "Grace", revision: 1 };
    const fetchMock = vi.fn(async () => jsonResponse(saved));
    vi.stubGlobal("fetch", fetchMock);
    const openStudent = vi.fn();
    const notify = vi.fn();
    const setStudents = vi.fn();

    const { result } = renderHook(() => useStudents({ data: makeData({ setStudents }), openStudent, onStudentRemoved: vi.fn(), notify }));

    act(() => result.current.openNewStudent());
    act(() => result.current.setStudentForm((current) => (current ? { ...current, name: "Grace" } : current)));
    await act(async () => result.current.saveStudent(submitEvent()));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("Alumno añadido."));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/students?project=default"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(openStudent).toHaveBeenCalledWith("s-new");
    expect(result.current.studentForm).toBeNull();
  });

  it("muestra el error del servidor si la ficha no se guarda", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "La ficha ya existe" }, false, 409)));

    const { result } = renderHook(() => useStudents({ data: makeData(), openStudent: vi.fn(), onStudentRemoved: vi.fn(), notify: vi.fn() }));

    act(() => result.current.openNewStudent());
    await act(async () => result.current.saveStudent(submitEvent()));

    expect(result.current.studentFormError).toBe("La ficha ya existe");
    expect(result.current.studentSaving).toBe(false);
  });

  it("elimina la ficha y descarta su detalle", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(student));
    vi.stubGlobal("fetch", fetchMock);
    const openStudent = vi.fn();
    const onStudentRemoved = vi.fn();
    const notify = vi.fn();

    const { result } = renderHook(() => useStudents({ data: makeData(), openStudent, onStudentRemoved, notify }));

    act(() => result.current.openRemoveStudent(student));
    expect(result.current.studentDeleting?.section).toBe("s1");
    await act(async () => result.current.deleteStudent());

    await waitFor(() => expect(notify).toHaveBeenCalledWith("Perfil eliminado."));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/students?project=default"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onStudentRemoved).toHaveBeenCalledWith("s1");
    expect(openStudent).toHaveBeenCalledWith(null);
    expect(result.current.studentDeleting).toBeNull();
  });
});
