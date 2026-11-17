import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentExtensions } from "./documentos-editor";
import { STARTER_DOCUMENT } from "./documentos-model";
import DocumentosApp from "./documentos-app";

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    loading: false,
    error: null,
  }),
}));

const props = { projectId: "p1", role: "owner" as const };

describe("Notas y documentos", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as { title: string; content: { type: string } };
    expect(saved.title).toBe("Ideas para la semana");
    expect(saved.content.type).toBe("doc");
    expect(screen.getByRole("status").textContent).toContain("guardado en el proyecto");
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

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/No hay un documento guardado válido/));
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
