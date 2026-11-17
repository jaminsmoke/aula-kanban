import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createDocumentExtensions } from "./documentos-editor";
import { STARTER_DOCUMENT } from "./documentos-model";
import DocumentosApp from "./documentos-app";

describe("Notas y documentos", () => {
  it("monta el título, el editor y la barra de formato", async () => {
    render(<DocumentosApp />);

    expect(screen.getByText("Notas y documentos")).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Ideas para la semana");
    expect(screen.getByRole("toolbar", { name: "Formato del documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negrita" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insertar o editar enlace" })).toBeTruthy();

    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Documento de ejemplo listo");
    expect(screen.getByText(/^\d+ palabras$/).textContent).not.toBe("0 palabras");
  });

  it("marca el documento como modificado al cambiar el título", async () => {
    render(<DocumentosApp />);
    await waitFor(() => expect(screen.getByLabelText("Contenido de la nota")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Título del documento"), {
      target: { value: "Notas de la excursión" },
    });

    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Título actualizado");
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
