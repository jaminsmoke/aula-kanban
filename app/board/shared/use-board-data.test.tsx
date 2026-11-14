import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBoardData } from "./use-board-data";
import { jsonResponse } from "../../../vitest.setup";

const activeProject = {
  id: "p1",
  name: "Aula",
  createdAt: 1,
  role: "student" as const,
  studentSection: "s1",
  teacherId: null,
};

const task = {
  id: "t1",
  title: "Informe",
  description: "",
  imageUrl: "",
  assignee: "",
  assignees: [],
  dueDate: "",
  priority: "normal" as const,
  status: "pending" as const,
  createdAt: 1,
  revision: 0,
};

const student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 1,
};

function stubBoardFetch() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith("/api/tasks")) return jsonResponse([task]);
    if (url.startsWith("/api/students")) return jsonResponse([student]);
    if (url.startsWith("/api/teachers")) return jsonResponse([{ id: "tch1", name: "Marta" }]);
    throw new Error("URL inesperada: " + url);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useBoardData", () => {
  it("carga tareas, fichas y profesorado del proyecto activo", async () => {
    stubBoardFetch();

    const { result } = renderHook(() => useBoardData(activeProject));
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    expect(result.current.students).toEqual([student]);
    expect(result.current.teachers).toEqual([{ id: "tch1", name: "Marta" }]);
    expect(result.current.ownStudent?.section).toBe("s1");
    expect(result.current.allPeople.map((person) => person.name)).toEqual(["Ada Lovelace", "Marta"]);
  });

  it("no recarga mientras hay una escritura en curso", async () => {
    const fetchMock = stubBoardFetch();

    const { result } = renderHook(() => useBoardData(activeProject));
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    fetchMock.mockClear();

    act(() => {
      result.current.writingRef.current = true;
      result.current.studentWritingRef.current = true;
    });
    await act(async () => {
      await result.current.refresh();
      await result.current.refreshStudents();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("expone el error de carga de tareas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Tablero no disponible" }, false, 500)));

    const { result } = renderHook(() => useBoardData(activeProject));
    await waitFor(() => expect(result.current.loadError).toBe("Tablero no disponible"));

    expect(result.current.studentError).toBe("Tablero no disponible");
  });
});
