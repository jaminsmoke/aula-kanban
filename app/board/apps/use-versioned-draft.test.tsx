import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WindowCloseProvider, useWindowAttemptClose } from "../store/window-close-guard";
import { jsonResponse } from "../../../vitest.setup";
import { useVersionedDraft } from "./use-versioned-draft";
import { readVersionedDraftRecovery } from "./versioned-draft-recovery";

/** Almacenamiento en memoria para no tocar `localStorage` entre pruebas. */
function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

describe("motor de borrador versionado", () => {
  it("carga la versión del servidor y la aplica como estado limpio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      state: { code: "graph LR" },
      updatedAt: 120,
    })));
    const applyLoaded = vi.fn(() => true);
    const { result } = renderHook(() => useVersionedDraft<{ code: string }>({
      projectId: "p1",
      appId: "mermaid",
      getValue: () => ({ code: "graph LR" }),
      applyLoaded,
      storage: null,
      autosaveDelayMs: 60_000,
    }));

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(applyLoaded).toHaveBeenCalledWith({ code: "graph LR" }, 120);
    expect(result.current.dirty).toBe(false);
    expect(result.current.lastSavedAt).toBe(120);
    expect(result.current.updatedAt).toBe(120);
    expect(result.current.status).toMatch(/cargado/);
  });

  it("guarda automáticamente los cambios y limpia el estado sucio", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ state: null, updatedAt: null }))
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const applyLoaded = vi.fn(() => true);
    const { result } = renderHook(() => useVersionedDraft<{ code: string }>({
      projectId: "p1",
      appId: "mermaid",
      getValue: () => ({ code: "nuevo" }),
      applyLoaded,
      storage: null,
      autosaveDelayMs: 5,
    }));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(applyLoaded).not.toHaveBeenCalled();
    expect(result.current.status).toBe("No hay un borrador guardado.");
    act(() => result.current.markDirty());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-documents?project=p1&app=mermaid",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ state: { code: "nuevo" }, expectedUpdatedAt: null }),
      }),
    );
    await waitFor(() => expect(result.current.dirty).toBe(false));
    expect(result.current.lastSavedAt).toBe(200);
    expect(result.current.status).toMatch(/automáticamente/);
  });

  it("conserva la copia local al recargar la versión del servidor", async () => {
    const storage = createStorage();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ state: { code: "servidor" }, updatedAt: 120 }))
      .mockResolvedValueOnce(jsonResponse({ accepted: false, conflict: true, updatedAt: 150 }, false, 409))
      .mockResolvedValueOnce(jsonResponse({ state: { code: "servidor-nuevo" }, updatedAt: 160 }));
    vi.stubGlobal("fetch", fetchMock);
    const applyLoaded = vi.fn(() => true);
    const { result } = renderHook(() => useVersionedDraft<{ code: string }>({
      projectId: "p1",
      appId: "mermaid",
      getValue: () => ({ code: "local" }),
      applyLoaded,
      storage,
      autosaveDelayMs: 60_000,
    }));

    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markDirty());
    await act(async () => {
      expect(await result.current.save(false)).toBe(false);
    });
    await waitFor(() => expect(result.current.conflict).toEqual({ serverUpdatedAt: 150 }));

    await act(async () => {
      expect(await result.current.reloadServerVersion()).toBe(true);
    });

    expect(applyLoaded).toHaveBeenLastCalledWith({ code: "servidor-nuevo" }, 160);
    expect(result.current.conflict).toBeNull();
    expect(result.current.dirty).toBe(false);
    expect(result.current.lastSavedAt).toBe(160);
    expect(result.current.status).toBe("Versión del servidor recargada.");
    expect(readVersionedDraftRecovery<{ code: string }>(storage, "p1", "mermaid")).toMatchObject({
      reason: "conflict",
      serverUpdatedAt: 150,
      value: { code: "local" },
    });
  });

  it("descarga la copia y conserva la versión local sobre la del servidor", async () => {
    const storage = createStorage();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ state: { code: "servidor" }, updatedAt: 120 }))
      .mockResolvedValueOnce(jsonResponse({ accepted: false, conflict: true, updatedAt: 150 }, false, 409))
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const downloadFile = vi.fn();
    const { result } = renderHook(() => useVersionedDraft<{ code: string }>({
      projectId: "p1",
      appId: "mermaid",
      getValue: () => ({ code: "local" }),
      applyLoaded: () => true,
      storage,
      downloadFile,
      autosaveDelayMs: 60_000,
    }));

    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.markDirty());
    await act(async () => {
      expect(await result.current.save(false)).toBe(false);
    });
    await waitFor(() => expect(result.current.conflict).toEqual({ serverUpdatedAt: 150 }));

    await act(async () => {
      expect(await result.current.keepMineVersion()).toBe(true);
    });

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(downloadFile.mock.calls[0][0]).toContain("\"code\": \"local\"");
    expect(downloadFile.mock.calls[0][2]).toBe("mermaid-borrador.json");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-documents?project=p1&app=mermaid",
      expect.objectContaining({
        body: JSON.stringify({ state: { code: "local" }, expectedUpdatedAt: 150 }),
      }),
    );
    expect(result.current.conflict).toBeNull();
    expect(result.current.dirty).toBe(false);
    expect(result.current.lastSavedAt).toBe(200);
  });

  it("bloquea el cierre con cambios pendientes y avisa a la app", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ state: null, updatedAt: null })));
    const onClose = vi.fn();
    const onCloseBlocked = vi.fn();

    function Harness() {
      const draft = useVersionedDraft<{ code: string }>({
        projectId: "p1",
        appId: "mermaid",
        getValue: () => ({ code: "local" }),
        applyLoaded: () => true,
        storage: null,
        autosaveDelayMs: 60_000,
        onCloseBlocked,
      });
      const attemptClose = useWindowAttemptClose();
      return (
        <>
          <button type="button" onClick={() => draft.markDirty()}>Editar</button>
          <button type="button" onClick={attemptClose}>Cerrar</button>
          <span>{draft.dirty ? "sucio" : "limpio"}</span>
        </>
      );
    }

    render(<WindowCloseProvider onClose={onClose}><Harness /></WindowCloseProvider>);
    await waitFor(() => expect(screen.getByText("limpio")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(onCloseBlocked).toHaveBeenCalledTimes(1);
  });
});
