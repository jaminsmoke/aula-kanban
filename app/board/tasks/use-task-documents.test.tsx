/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskDocuments } from "./use-task-documents";

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

describe("documentos de una tarea", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("carga activos, archivados y eliminados del proyecto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      active: [{ id: "doc1", title: "Informe" }],
      archived: [{ id: "doc2", title: "Antiguo" }],
      deleted: [{ id: "doc3", title: "Papelera" }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useTaskDocuments("p1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith("/api/aula-documentos?project=p1", { cache: "no-store" });
    expect(result.current.documents).toEqual([
      { id: "doc1", title: "Informe", status: "active" },
      { id: "doc2", title: "Antiguo", status: "archived" },
      { id: "doc3", title: "Papelera", status: "deleted" },
    ]);
    expect(result.current.error).toBe("");
  });

  it("informa del error de carga", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 500)));

    const { result } = renderHook(() => useTaskDocuments("p1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toContain("No se pudieron cargar");
    expect(result.current.documents).toEqual([]);
  });
});
