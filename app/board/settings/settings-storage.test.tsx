import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import SettingsStorage from "./settings-storage";

const status = { database: true, bucket: true, bucketReachable: true, uploads: 3, ok: true };

describe("SettingsStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el estado correcto y el número de archivos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(status)));
    render(<SettingsStorage />);
    expect(await screen.findByText("Disponible")).toBeTruthy();
    expect(screen.getByText("3 archivos con metadatos. Las imágenes y documentos se pueden subir.")).toBeTruthy();
  });

  it("resume las subidas por origen y tamaño", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      ...status,
      uploadStats: { total: 2, rows: [
        { origin: "web", purpose: "task-image", count: 1, bytes: 40_000, maxBytes: 40_000, over1mb: 0, over2mb: 0 },
        { origin: "mcp", purpose: "board-asset", count: 1, bytes: 3_145_728, maxBytes: 3_145_728, over1mb: 1, over2mb: 1 },
      ] },
    })));
    render(<SettingsStorage />);

    expect(await screen.findByText(/mcp\/board-asset/)).toBeTruthy();
    expect(screen.getByText(/≥1 MB: 1 · ≥2 MB: 1/)).toBeTruthy();
  });

  it("avisa cuando falta R2", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ database: true, bucket: false, bucketReachable: false, uploads: 2, ok: false })));
    render(<SettingsStorage />);
    expect(await screen.findByText("Revisar configuración")).toBeTruthy();
    expect(screen.getByText("Las imágenes y documentos no se podrán subir ni mostrar hasta que R2 esté disponible.")).toBeTruthy();
  });

  it("muestra el error del diagnóstico", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Solo el propietario o un administrador pueden consultar el almacenamiento." }, false, 403)));
    render(<SettingsStorage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Solo el propietario");
  });

  it("simula la limpieza sin borrar y resume lo que se haría", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({
        simulated: true, projects: 1, candidates: 2, deleted: 0, skipped: 0, failed: 0, bytes: 20, hasMore: false, problems: [],
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Simular limpieza" }));

    expect(await screen.findByText("Simulación: 2 archivos sin uso en 1 proyecto (20 B).")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/storage/purge", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ simulacion: true }),
    }));
  });

  it("solo limpia tras confirmar y muestra los recuentos", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({
        simulated: false, projects: 2, candidates: 3, deleted: 3, skipped: 1, failed: 0, bytes: 300, hasMore: true, problems: [],
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Limpiar archivos" }));

    expect(await screen.findByText("Limpieza: 3 archivos borrados (300 B); 1 omitido por referencia nueva y 0 con error.")).toBeTruthy();
    expect(screen.getByText("Quedan más archivos; vuelve a ejecutar la limpieza.")).toBeTruthy();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ simulacion: false });
  });

  it("no limpia si se cancela la confirmación", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Limpiar archivos" }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Limpieza:/)).toBeNull();
  });

  it("muestra el error de la limpieza y los proyectos ilegibles", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, false, 503))
      .mockResolvedValueOnce(jsonResponse({
        simulated: false, projects: 1, candidates: 2, deleted: 2, skipped: 0, failed: 0, bytes: 40, hasMore: false,
        problems: [{ projectId: "p1", reason: "references_unreadable" }],
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);

    fireEvent.click(await screen.findByRole("button", { name: "Limpiar archivos" }));
    expect((await screen.findByRole("alert")).textContent).toContain("no está configurado");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar archivos" }));
    expect(await screen.findByText("1 proyecto con documentos ilegibles; no se tocaron.")).toBeTruthy();
  });

  it("revisa el inventario y avisa de que es solo lectura", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({
        entries: [
          { status: "con_fila", key: "p/task-image/a.png", size: 10, uploaded: 0, etag: "e1", uploadId: "a", projectId: "p" },
          { status: "objeto_sin_fila", key: "p/task-image/b.png", size: 2048, uploaded: 0, etag: "e2", uploadId: null, projectId: null },
          { status: "clave_revisar", key: "default/original", size: 5, uploaded: 0, etag: "e3", uploadId: null, projectId: null },
          { status: "fila_sin_objeto", id: "d", projectId: "p", storageKey: "p/task-image/d.png" },
        ],
        counts: { objects: 3, withRow: 1, orphanObjects: 1, missingObjects: 1, reviewKeys: 1 },
        truncated: false, cursor: null, range: null,
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Revisar inventario" }));

    expect(await screen.findByText("Objetos: 3 · con fila: 1 · sin fila: 1 · filas sin objeto: 1 · claves a revisar: 1")).toBeTruthy();
    expect(screen.getByText("Objeto sin fila")).toBeTruthy();
    expect(screen.getByText("Revisar clave")).toBeTruthy();
    expect(screen.getByText("p/task-image/b.png")).toBeTruthy();
    expect(screen.getByText("2.0 KB · 1970-01-01")).toBeTruthy();
    expect(screen.getByText("Fin del inventario: no quedan páginas.")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/storage/inventory");
    expect(screen.queryByRole("button", { name: /borrar/i })).toBeNull();
  });

  it("carga la página siguiente con el cursor y acumula los recuentos", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({
        entries: [{ status: "objeto_sin_fila", key: "p/task-image/a.png", size: 1, uploaded: 0, etag: "e", uploadId: null, projectId: null }],
        counts: { objects: 1, withRow: 0, orphanObjects: 1, missingObjects: 0, reviewKeys: 0 },
        truncated: true, cursor: "c2", range: { from: "p/task-image/a.png", to: "p/task-image/a.png" },
      }))
      .mockResolvedValueOnce(jsonResponse({
        entries: [{ status: "fila_sin_objeto", id: "d", projectId: "p", storageKey: "p/task-image/z.png" }],
        counts: { objects: 0, withRow: 0, orphanObjects: 0, missingObjects: 1, reviewKeys: 0 },
        truncated: false, cursor: null, range: null,
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Revisar inventario" }));
    expect(await screen.findByText("Hay más páginas; usa «Cargar más» hasta llegar al final.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByText("Objetos: 1 · con fila: 0 · sin fila: 1 · filas sin objeto: 1 · claves a revisar: 0")).toBeTruthy();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/storage/inventory?cursor=c2");
  });

  it("muestra el error del inventario sin perder el diagnóstico", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(status))
      .mockResolvedValueOnce(jsonResponse({ message: "El almacenamiento de archivos no está configurado en este despliegue." }, false, 503));
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsStorage />);
    fireEvent.click(await screen.findByRole("button", { name: "Revisar inventario" }));

    expect((await screen.findByRole("alert")).textContent).toContain("no está configurado");
    expect(screen.getByText("Disponible")).toBeTruthy();
  });
});
