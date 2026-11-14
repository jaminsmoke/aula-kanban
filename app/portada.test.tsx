import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Portada from "./portada";

describe("Portada", () => {
  it("explica qué es Aula Kanban con enlace a documentación e inicio de sesión", () => {
    render(<Portada signInHref="/signin-with-chatgpt?return_to=%2F" />);

    expect(screen.getByRole("heading", { level: 1, name: "Tablero colaborativo para el grupo de clase" })).toBeTruthy();
    expect(screen.getByText(/Organiza el trabajo del proyecto en tareas/)).toBeTruthy();

    const signIn = screen.getByRole("link", { name: "Iniciar sesión con ChatGPT" });
    expect(signIn.getAttribute("href")).toBe("/signin-with-chatgpt?return_to=%2F");
    expect(signIn.getAttribute("target")).toBe("_top");

    expect(screen.getByRole("link", { name: "Ver documentación" }).getAttribute("href")).toBe("/documentacion");
  });
});
