import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./modal";

describe("Modal", () => {
  it("muestra el título y el contenido", () => {
    render(<Modal title="Editar tarea" onClose={vi.fn()}><p>Contenido</p></Modal>);

    expect(screen.getByRole("dialog", { name: "Editar tarea" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Editar tarea" })).toBeTruthy();
    expect(screen.getByText("Contenido")).toBeTruthy();
  });

  it("cierra con el botón de la cabecera", () => {
    const onClose = vi.fn();
    render(<Modal title="Ajustes" onClose={onClose}><p>Contenido</p></Modal>);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("intercepta Escape y delega el cierre", () => {
    const onClose = vi.fn();
    render(<Modal title="Ajustes" onClose={onClose}><p>Contenido</p></Modal>);

    const dialog = screen.getByRole("dialog", { name: "Ajustes" });
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));

    expect(onClose).toHaveBeenCalled();
  });
});
