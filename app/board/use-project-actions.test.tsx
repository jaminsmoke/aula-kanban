import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProjectActions } from "./use-project-actions";
import { jsonResponse, stubLocation } from "../../vitest.setup";

const project = {
  id: "p1",
  name: "Curso IA",
  createdAt: 1,
  role: "owner" as const,
  studentSection: null,
  teacherId: null,
};

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("useProjectActions", () => {
  it("crea el proyecto y navega a él con una URL absoluta", async () => {
    const { assign } = stubLocation("");
    const fetchMock = vi.fn(async () => jsonResponse({ ...project, id: "p9" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProjectActions({ projects: [], projectId: "p1" }));

    act(() => result.current.openNewProject());
    act(() => result.current.setNewProject((current) => (current ? { ...current, name: "Nuevo" } : current)));
    await act(async () => result.current.createProject(submitEvent()));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("http://localhost:5173/?project=p9"));
    expect(fetchMock).toHaveBeenCalledWith("/api/projects", expect.objectContaining({ method: "POST" }));
  });

  it("no borra el proyecto si el nombre no coincide", async () => {
    stubLocation("");
    const fetchMock = vi.fn(async () => jsonResponse(project));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProjectActions({ projects: [project], projectId: "p1" }));

    act(() => result.current.openDeleteProject());
    act(() => result.current.setDeleteProjectName("otro nombre"));
    act(() => result.current.submitDelete(submitEvent()));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("borra el proyecto confirmado y vuelve al inicio", async () => {
    const { assign } = stubLocation("");
    const fetchMock = vi.fn(async () => jsonResponse(project));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProjectActions({ projects: [project], projectId: "p1" }));

    act(() => result.current.openDeleteProject());
    act(() => result.current.setDeleteProjectName("Curso IA"));
    await act(async () => result.current.submitDelete(submitEvent()));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("http://localhost:5173/"));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/projects"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("comparte el enlace del proyecto activo", () => {
    stubLocation("?project=p1");

    const { result } = renderHook(() => useProjectActions({ projects: [project], projectId: "p1" }));
    act(() => result.current.openShare());

    expect(result.current.shareUrl).toBe("http://localhost:5173/?project=p1");
  });
});
