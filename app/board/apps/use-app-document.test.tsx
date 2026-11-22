import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAppDocument, type VersionedSaveResult } from "./use-app-document";
import { jsonResponse } from "../../../vitest.setup";

describe("documento de app", () => {
  it("carga el estado y marca la fecha del servidor", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ state: { code: "flowchart TD" }, updatedAt: 120 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppDocument<{ code: string }>("p1", "mermaid"));

    let loaded: { state: { code: string } | null; updatedAt: number | null; ok?: boolean } | undefined;
    await act(async () => { loaded = await result.current.load(); });

    expect(loaded).toEqual({ state: { code: "flowchart TD" }, updatedAt: 120, ok: true });
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

  it("distingue un conflicto de versión al guardar con la versión esperada", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 300 }))
      .mockResolvedValueOnce(jsonResponse({ accepted: false, conflict: true, updatedAt: 400 }, false, 409));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppDocument<{ code: string }>("p1", "aula-documentos"));

    let saved: VersionedSaveResult | undefined;
    await act(async () => { saved = await result.current.saveVersioned({ code: "graph LR" }, 200); });
    expect(saved).toEqual({ status: "saved", updatedAt: 300 });
    expect(result.current.updatedAt).toBe(300);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-documents?project=p1&app=aula-documentos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ state: { code: "graph LR" }, expectedUpdatedAt: 200 }),
      }),
    );

    await act(async () => { saved = await result.current.saveVersioned({ code: "graph LR" }, 300); });
    expect(saved).toEqual({ status: "conflict", updatedAt: 400 });
    expect(result.current.updatedAt).toBe(300);
    expect(result.current.error).toMatch(/ha cambiado en otra sesión/);
  });

  it("guarda con la versión cargada y bloquea después de una carga fallida", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ state: { code: "graph LR" }, updatedAt: 5 }))
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 6 }))
      .mockResolvedValueOnce(jsonResponse({ message: "sin conexión" }, false, 502));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAppDocument<{ code: string }>("p1", "mapas"));

    await act(async () => { await result.current.load(); });
    let saved: VersionedSaveResult | undefined;
    await act(async () => { saved = await result.current.saveCurrentVersioned({ code: "graph LR" }); });
    expect(saved).toEqual({ status: "saved", updatedAt: 6 });
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ state: { code: "graph LR" }, expectedUpdatedAt: 5 }),
    }));

    await act(async () => { await result.current.load(); });
    expect(result.current.loadFailed).toBe(true);
    const callsAfterFailure = fetchMock.mock.calls.length;
    await act(async () => { saved = await result.current.saveCurrentVersioned({ code: "graph LR" }); });
    expect(saved).toEqual({ status: "failed" });
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFailure);
  });
});
