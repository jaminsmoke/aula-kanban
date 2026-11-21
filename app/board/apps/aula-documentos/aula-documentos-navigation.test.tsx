import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { props, resetAulaDocumentMocks, suiteMock } from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("navegación de Aula Documentos", () => {
  afterEach(() => {
    suiteMock.documentId = "legacy";
    resetAulaDocumentMocks();
  });

  it("salta a secciones y diapositivas y abre la vista previa en la activa", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const outline = await screen.findByRole("navigation", { name: "Esquema del documento" });
    expect(within(outline).getByRole("button", { name: "Introducción" })).toBeTruthy();
    expect(within(outline).getByRole("button", { name: "Plan de trabajo" })).toBeTruthy();
    expect(await screen.findByLabelText("Sección actual: Introducción")).toBeTruthy();

    fireEvent.click(within(outline).getByRole("button", { name: "Plan de trabajo" }));
    await waitFor(() => {
      expect(within(outline).getByRole("button", { name: "Plan de trabajo" }).getAttribute("aria-current")).toBe("location");
      expect(screen.getByRole("button", { name: "Ir a la diapositiva 2: Plan de trabajo" }).getAttribute("aria-current")).toBe("location");
      expect(screen.getByLabelText("Sección actual: Plan de trabajo")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Vista previa desde la diapositiva 2" }));
    expect(await screen.findByText("Diapositiva 2 de 2")).toBeTruthy();
  });

  it("entra y sale del enfoque con botón, Escape y atajo, restaurando el foco", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    const app = document.querySelector(".aula-documentos-app");
    const editor = screen.getByLabelText("Contenido del documento");
    const focusButton = screen.getByRole("button", { name: "Entrar en modo enfoque" });

    fireEvent.click(focusButton);
    expect(app?.className).toContain("is-focus-mode");
    expect(screen.getByRole("button", { name: "Salir del modo enfoque" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("button", { name: "Salir del modo enfoque" }), { key: "Escape" });
    await waitFor(() => expect(app?.className).not.toContain("is-focus-mode"));
    await waitFor(() => expect(document.activeElement).toBe(focusButton));

    fireEvent.keyDown(editor, { key: "f", altKey: true, shiftKey: true });
    expect(app?.className).toContain("is-focus-mode");
    fireEvent.keyDown(editor, { key: "f", altKey: true, shiftKey: true });
    expect(app?.className).not.toContain("is-focus-mode");
  });

  it("oculta y muestra el esquema con el atajo y conserva la búsqueda al cerrar con Escape", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    const app = document.querySelector(".aula-documentos-app");
    const editor = screen.getByLabelText("Contenido del documento");

    fireEvent.keyDown(editor, { key: "o", ctrlKey: true, shiftKey: true });
    expect(screen.queryByRole("navigation", { name: "Esquema del documento" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mostrar esquema" })).toBeTruthy();

    fireEvent.keyDown(editor, { key: "o", ctrlKey: true, shiftKey: true });
    expect(screen.getByRole("navigation", { name: "Esquema del documento" })).toBeTruthy();

    fireEvent.keyDown(editor, { key: "f", altKey: true, shiftKey: true });
    fireEvent.keyDown(editor, { key: "f", ctrlKey: true });
    const search = screen.getByLabelText("Texto que buscar");
    expect(search).toBeTruthy();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByLabelText("Texto que buscar")).toBeNull();
    expect(app?.className).toContain("is-focus-mode");
  });

  it("cierra la búsqueda al cambiar de documento", async () => {
    const { rerender } = render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Buscar en el documento" }));
    fireEvent.change(screen.getByLabelText("Texto que buscar"), { target: { value: "clase" } });
    expect(await screen.findByText("1 de 1")).toBeTruthy();

    suiteMock.documentId = "otro-documento";
    rerender(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.queryByLabelText("Texto que buscar")).toBeNull());
  });
});
