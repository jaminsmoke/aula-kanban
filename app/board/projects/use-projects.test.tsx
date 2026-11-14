import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProjects } from "./use-projects";
import { jsonResponse, stubLocation } from "../../../vitest.setup";

const aula = {
  id: "p1",
  name: "Aula",
  createdAt: 1,
  role: "owner" as const,
  studentSection: null,
  teacherId: null,
};

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("useProjects", () => {
  it("carga los proyectos y resuelve el activo desde el enlace", async () => {
    stubLocation("?project=p1");
    const fetchMock = vi.fn(async () => jsonResponse({ projects: [aula], isOwner: true, isAdmin: true }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projectsLoaded).toBe(true));

    expect(result.current.projects).toEqual([aula]);
    expect(result.current.activeProject?.name).toBe("Aula");
    expect(result.current.activeProjectId).toBe("p1");
    expect(result.current.owner).toBe(true);
    expect(result.current.admin).toBe(true);
    expect(result.current.hasProjectLink).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/projects", expect.objectContaining({ method: "GET" }));
  });

  it("redirige al primer proyecto cuando el enlace no trae uno válido", async () => {
    const { replace } = stubLocation("");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ projects: [aula], isOwner: false })));

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?project=p1"));

    expect(result.current.projectsLoaded).toBe(false);
    expect(result.current.projects).toEqual([]);
  });

  it("deja el mensaje del servidor cuando la carga falla", async () => {
    stubLocation("");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Sin sesión" }, false, 401)));

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projectLoadError).toBe("Sin sesión"));

    expect(result.current.projectsLoaded).toBe(true);
    expect(result.current.projects).toEqual([]);
  });
});
