import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CalculadoraApp from "./calculadora-app";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Calculadora", () => {
  it("abre la calculadora y amplía a científica", () => {
    render(<CalculadoraApp />);
    expect(screen.getByRole("button", { name: "7" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Científica" }));
    expect(screen.getByLabelText("Seno")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Básica" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ecuaciones" }));
    expect(document.querySelector(".calc-equations")).toBeTruthy();
  });

  it("calcula una suma con el ratón", async () => {
    render(<CalculadoraApp />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar" }));
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    fireEvent.click(screen.getByRole("button", { name: "Igual" }));
    expect(await screen.findByText("15", { selector: ".calc-value" })).toBeTruthy();
  });

  it("calcula una suma con el teclado", async () => {
    render(<CalculadoraApp />);
    for (const key of ["7", "+", "8", "Enter"]) fireEvent.keyDown(window, { key });
    expect(await screen.findByText("15", { selector: ".calc-value" })).toBeTruthy();
  });

  it("calcula funciones científicas", async () => {
    render(<CalculadoraApp />);
    fireEvent.click(screen.getByRole("button", { name: "Científica" }));
    fireEvent.click(screen.getByRole("button", { name: "Raíz cuadrada" }));
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar paréntesis" }));
    fireEvent.click(screen.getByRole("button", { name: "Igual" }));
    expect(await screen.findByText("3", { selector: ".calc-value" })).toBeTruthy();
  });

  it("guarda la memoria y el historial de operaciones", async () => {
    render(<CalculadoraApp />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Igual" }));
    await screen.findByText("5", { selector: ".calc-value" });

    fireEvent.click(screen.getByRole("button", { name: "Sumar a memoria" }));
    expect(screen.getByText(/M 5/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Historial/ }));
    const entry = screen.getByText("2+3", { selector: ".calc-history-expr" });
    fireEvent.click(entry);
    expect(document.querySelector(".calc-expression")?.textContent).toBe("2+3");
  });

  it("escribe en las líneas con el teclado de ecuaciones", async () => {
    render(<CalculadoraApp />);
    fireEvent.click(screen.getByRole("button", { name: "Ecuaciones" }));
    fireEvent.click(await screen.findByLabelText("Línea 1"));
    const pad = within(document.querySelector(".multi-eq-pad") as HTMLElement);
    fireEvent.click(pad.getByRole("button", { name: "7" }));
    fireEvent.click(pad.getByRole("button", { name: "Sumar" }));
    fireEvent.click(pad.getByRole("button", { name: "8" }));
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("= 15")).toBeTruthy();
  });

  it("calcula varias líneas con variables compartidas", async () => {
    render(<CalculadoraApp />);
    fireEvent.click(screen.getByRole("button", { name: "Ecuaciones" }));
    fireEvent.change(await screen.findByLabelText("Línea 1"), { target: { value: "x=5" } });
    fireEvent.change(screen.getByLabelText("Línea 2"), { target: { value: "y=2" } });
    fireEvent.change(screen.getByLabelText("Línea 3"), { target: { value: "x+y" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("= 7")).toBeTruthy();
    expect(screen.getByText("= 5")).toBeTruthy();
    expect(screen.getByText("= 2")).toBeTruthy();
  });
});
