import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Portada from "./portada";

describe("Portada", () => {
  it("presenta el producto, sus bloques de valor y el plugin de ChatGPT", () => {
    render(<Portada signInHref="/signin-with-chatgpt?return_to=%2F" />);

    expect(screen.getByRole("heading", { level: 1, name: "Tu clase, en orden." })).toBeTruthy();
    expect(screen.getByText(/Aula Kanban es un tablero colaborativo para el grupo de clase/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Un tablero para coordinar la clase" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Tareas y calendario" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Personas y materiales" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Pizarras y apps" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Tu asistente trabaja con el mismo tablero" })).toBeTruthy();
  });

  it("mantiene el inicio de sesión y enlaza la documentación", () => {
    render(<Portada signInHref="/signin-with-chatgpt?return_to=%2F" />);

    const signIn = screen.getByRole("link", { name: "Iniciar sesión con ChatGPT" });
    expect(signIn.getAttribute("href")).toBe("/signin-with-chatgpt?return_to=%2F");
    expect(signIn.getAttribute("target")).toBe("_top");

    expect(screen.getByRole("link", { name: "Ver documentación" }).getAttribute("href")).toBe("/documentacion");
    expect(screen.getByRole("link", { name: "Documentación y guía del plugin" }).getAttribute("href")).toBe("/documentacion");
  });
});
