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
});
