import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { useWindowAttemptClose, WindowCloseProvider } from "../../shared/window-close-guard";
import type { VersionedSaveResult } from "../use-app-document";
import { createDocumentExtensions } from "./documentos-editor";
import { STARTER_DOCUMENT } from "./documentos-model";
import DocumentosApp from "./documentos-app";

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
  saveVersioned: vi.fn(async (state: unknown, _expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => {
    const ok = await documentMock.save(state);
    return ok
      ? { status: "saved" as const, updatedAt: Date.now() }
      : { status: "failed" as const };
  }),
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

const props = { projectId: "p1", role: "owner" as const };

/**
 * Sustituye la descarga del navegador para comprobar el nombre del archivo.
 * @returns Los nombres de archivo solicitados.
 */
function stubDownload() {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:notas") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function captureDownload(this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
  return downloads;
}

describe("Notas y documentos", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });
  it("monta el título, el editor y la barra de formato", async () => {
    render(<DocumentosApp {...props} />);

    expect(screen.getByText("Notas y documentos")).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Ideas para la semana");
    expect(screen.getByRole("toolbar", { name: "Formato del documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negrita" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insertar o editar enlace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toBeTruthy();

    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Documento de ejemplo listo");
    await waitFor(() => expect(screen.getByText(/^\d+ palabras$/).textContent).not.toBe("0 palabras"));
  });

  it("marca el documento como modificado al cambiar el título", async () => {
    render(<DocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Título del documento"), {
      target: { value: "Notas de la excursión" },
    });

    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Título actualizado");
  });

  it("guarda el documento validado en el proyecto", async () => {
    render(<DocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    const saved = documentMock.saveVersioned.mock.calls[0][0] as { title: string; content: { type: string } };
    expect(saved.title).toBe("Ideas para la semana");
    expect(saved.content.type).toBe("doc");
    expect(screen.getByRole("status").textContent).toContain("Borrador guardado");
  });

  it("exporta con un nombre derivado del título", async () => {
    const downloads = stubDownload();
    render(<DocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Notas de la excursión" } });
    fireEvent.click(screen.getByRole("button", { name: "Exportar HTML" }));

    expect(downloads).toEqual(["notas-de-la-excursion.html"]);
  });

  it("carga un documento guardado", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { title: "Nota recuperada", content: STARTER_DOCUMENT.content },
      updatedAt: 1,
    });

    render(<DocumentosApp {...props} />);

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Nota recuperada"));
    expect(screen.getByRole("status").textContent).toContain("guardado cargado");
  });

  it("mantiene el ejemplo si el documento guardado no es válido", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { title: "Roto", content: { type: "image" } },
      updatedAt: 1,
    });

    render(<DocumentosApp {...props} />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/No se pudo interpretar el borrador guardado/));
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Ideas para la semana");
  });

  it("deja el documento en solo lectura para invitados", async () => {
    render(<DocumentosApp projectId="p1" role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("readOnly", true);
    expect(screen.getByRole("button", { name: "Guardar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: "Negrita" })).toBeNull();
    expect(screen.getByLabelText("Contenido de la nota").getAttribute("contenteditable")).toBe("false");
  });

  it("resuelve un conflicto recargando la versión del servidor", async () => {
    documentMock.load
      .mockResolvedValueOnce({
        state: { title: "Versión del servidor", content: STARTER_DOCUMENT.content },
        updatedAt: 5,
      })
      .mockResolvedValueOnce({
        state: { title: "Versión recargada", content: STARTER_DOCUMENT.content },
        updatedAt: 6,
      });
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 7 });

    render(<DocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión del servidor"));

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambio local" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    expect(await screen.findByRole("dialog", { name: "Conflicto de versión" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recargar versión del servidor" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Conflicto de versión" })).toBeNull());
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión recargada");
    expect(documentMock.saveVersioned.mock.calls[0][1]).toBe(5);
  });

  it("avisa antes de cerrar con cambios pendientes", async () => {
    const onClose = vi.fn();
    function CloseTrigger() {
      const attemptClose = useWindowAttemptClose();
      return <button type="button" onClick={attemptClose}>Cerrar ventana</button>;
    }

    render(
      <WindowCloseProvider onClose={onClose}>
        <DocumentosApp {...props} />
        <CloseTrigger />
      </WindowCloseProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Sin guardar" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ventana" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "Cambios sin guardar" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sin guardar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("aplica formatos con la configuración real del editor", () => {
    const editor = new Editor({
      extensions: createDocumentExtensions(),
      content: STARTER_DOCUMENT.content,
    });

    editor.commands.selectAll();
    editor.chain().toggleBold().run();
    expect(editor.getHTML()).toContain("<strong>");

    editor.chain().unsetBold().toggleItalic().run();
    expect(editor.getHTML()).toContain("<em>");

    editor.chain().selectAll().toggleHeading({ level: 2 }).run();
    expect(editor.getHTML()).toContain("<h2>");

    editor.chain().selectAll().toggleBulletList().run();
    expect(editor.getHTML()).toContain("<ul>");
    expect(editor.getHTML()).toContain("<li>");

    editor.commands.selectAll();
    editor.chain().setLink({ href: "https://example.com" }).run();
    expect(editor.getHTML()).toContain('href="https://example.com"');

    editor.destroy();
  });
});
