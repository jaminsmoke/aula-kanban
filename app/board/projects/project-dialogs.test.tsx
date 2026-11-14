import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RemixDialog } from "./project-dialogs";

describe("RemixDialog", () => {
  it("deja como propietario a quien da la orden y pide una copia vacía", () => {
    render(<RemixDialog onClose={vi.fn()} />);

    const prompt = screen.getByRole("textbox", { name: "Mensaje para Sites" }) as HTMLTextAreaElement;
    expect(prompt.value).toContain("el propietario es quien da esta orden");
    expect(prompt.value).toContain("OWNER_EMAIL");
    expect(prompt.value).toContain("copia vacía");
    expect(prompt.value).toContain("sin proyectos, tareas, fichas, administradores ni variables de entorno");

    expect(screen.getByText(/El propietario de la copia es/)).toBeTruthy();
    expect(screen.getByText(/no hace falta que un tercero reclame la instancia/)).toBeTruthy();
    expect(screen.getByText(/solo copia el mensaje y abre ChatGPT/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir ChatGPT" }).getAttribute("target")).toBe("_blank");
  });

  it("ofrece el mensaje de clonado con git junto al de Sites", () => {
    render(<RemixDialog onClose={vi.fn()} />);

    expect(screen.getByText(/git clone https:\/\/github\.com\/jaminsmoke\/aula-kanban\.git/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar mensaje (git)" })).toBeTruthy();
  });
});
