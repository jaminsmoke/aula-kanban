import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAppDocument } from "./use-app-document";
import { jsonResponse } from "../../../vitest.setup";

describe("documento de app", () => {
  it("carga el estado y marca la fecha del servidor", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ state: { code: "flowchart TD" }, updatedAt: 120 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppDocument<{ code: string }>("p1", "mermaid"));

    let loaded: { state: { code: string } | null; updatedAt: number | null } | undefined;
    await act(async () => { loaded = await result.current.load(); });

    expect(loaded).toEqual({ state: { code: "flowchart TD" }, updatedAt: 120 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.updatedAt).toBe(120);
    expect(fetchMock).toHaveBeenCalledWith("/api/app-documents?project=p1&app=mermaid", { cache: "no-store" });
  });

  it("guarda el estado y devuelve error sin romper la app", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 200 }))
      .mockResolvedValueOnce(jsonResponse({ message: "sin conexión" }, false, 502));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppDocument<{ code: string }>("p1", "mermaid"));

    let saved: boolean | undefined;
    await act(async () => { saved = await result.current.save({ code: "graph LR" }); });
    expect(saved).toBe(true);
    expect(result.current.updatedAt).toBe(200);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-documents?project=p1&app=mermaid",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ state: { code: "graph LR" } }) }),
    );

    await act(async () => { saved = await result.current.save({ code: "graph LR" }); });
    expect(saved).toBe(false);
    expect(result.current.error).toMatch(/No se pudo guardar/);
  });
});
