import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWindowAttemptClose, WindowCloseProvider } from "../../shared/window-close-guard";
import type { VersionedSaveResult } from "../use-app-document";

const revealMock = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  destroy: vi.fn(),
}));

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
  saveVersioned: vi.fn(async (state: unknown, _expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => {
    const ok = await documentMock.save(state);
    return ok
      ? { status: "saved" as const, updatedAt: 10 }
      : { status: "failed" as const };
  }),
}));

vi.mock("reveal.js", () => ({
  default: class {
    initialize = revealMock.initialize;
    destroy = revealMock.destroy;
  },
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    saveVersioned: documentMock.saveVersioned,
    loading: false,
    updatedAt: null,
    error: null,
  }),
}));

import PresentacionesApp from "./presentaciones-app";

const props = { projectId: "p1", role: "owner" as const };

/**
 * Sustituye la descarga del navegador para comprobar el nombre del archivo.
 * @returns Los nombres de archivo solicitados.
 */
function stubDownload() {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:presentacion") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function captureDownload(this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  return downloads;
}

describe("Presentaciones", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });

  it("actualiza la vista previa al editar el Markdown", () => {
    render(<PresentacionesApp {...props} />);
    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Nueva\n\nTexto\n\n---\n\n## Dos" },
    });

    expect(screen.getAllByText("2 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByText("Nueva")).toBeTruthy();
    expect(screen.getByText("Dos")).toBeTruthy();
  });

  it("abre y cierra el modo presentación", () => {
    const { container } = render(<PresentacionesApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Presentar" }));

    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(container.querySelectorAll(".presentaciones-slide")).toHaveLength(3);
    expect(revealMock.initialize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(screen.getByLabelText("Editor de diapositivas")).toBeTruthy();
    expect(revealMock.destroy).toHaveBeenCalledTimes(1);
  });

  it("reinicia el documento inicial tras confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PresentacionesApp {...props} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Reiniciar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Solo una" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain("Presentación reiniciada");
  });

  it("aplica la plantilla de proyecto", async () => {
    render(<PresentacionesApp {...props} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Aplicar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.change(screen.getByLabelText("Plantilla"), { target: { value: "proyecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByText("Presentación del proyecto")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Plantilla «Proyecto» aplicada");
  });

  it("guarda la presentación en el proyecto", async () => {
    render(<PresentacionesApp {...props} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    expect(documentMock.saveVersioned.mock.calls[0][0]).toEqual({ markdown: expect.stringContaining("Nuestra presentación") });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Borrador guardado"));
  });

  it("confirma antes de cargar y aplica la versión del servidor", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    documentMock.load
      .mockResolvedValueOnce({ state: null, updatedAt: null })
      .mockResolvedValueOnce({ state: { markdown: "# Presentación cargada" }, updatedAt: 4 });
    render(<PresentacionesApp {...props} />);
    const editor = screen.getByLabelText("Editor de diapositivas");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cargar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.change(editor, { target: { value: "# Cambio local" } });

    fireEvent.click(screen.getByRole("button", { name: "Cargar" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(documentMock.load).toHaveBeenCalledTimes(1);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Cargar" }));
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toBe("# Presentación cargada"));
    expect(screen.getByRole("status").textContent).toContain("Presentación cargada");
  });

  it("exporta con el título de la primera diapositiva", async () => {
    const downloads = stubDownload();
    render(<PresentacionesApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar HTML" }));

    expect(downloads).toEqual(["nuestra-presentacion.html"]);
  });

  it("resuelve un conflicto sin salir del modo presentación", async () => {
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 8 });
    documentMock.load
      .mockResolvedValueOnce({ state: null, updatedAt: null })
      .mockResolvedValueOnce({ state: { markdown: "# Versión recargada" }, updatedAt: 9 });
    render(<PresentacionesApp {...props} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Cargar" }).hasAttribute("disabled")).toBe(false));
    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), { target: { value: "# Cambio local" } });
    fireEvent.click(screen.getByRole("button", { name: "Presentar" }));
    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();

    expect(await screen.findByRole("dialog", { name: "Conflicto de versión" }, { timeout: 2_500 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recargar versión del servidor" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Conflicto de versión" })).toBeNull());
    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(screen.getByText("Versión recargada")).toBeTruthy();
  });

  it("avisa antes de cerrar con cambios pendientes", async () => {
    const onClose = vi.fn();
    function CloseTrigger() {
      const attemptClose = useWindowAttemptClose();
      return <button type="button" onClick={attemptClose}>Cerrar ventana</button>;
    }

    render(
      <WindowCloseProvider onClose={onClose}>
        <PresentacionesApp {...props} />
        <CloseTrigger />
      </WindowCloseProvider>,
    );
    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), { target: { value: "# Sin guardar" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ventana" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "Cambios sin guardar" })).toBeTruthy();
  });

  it("deja la presentación en solo lectura para invitados", () => {
    render(<PresentacionesApp projectId="p1" role="guest" />);
    expect(screen.getByLabelText("Editor de diapositivas")).toHaveProperty("readOnly", true);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
  });
});
