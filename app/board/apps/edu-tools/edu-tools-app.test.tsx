import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import EduToolsApp from "./edu-tools-app";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Herramientas de aula", () => {
  it("abre la calculadora, amplía a científica y cambia a la tabla periódica", async () => {
    render(<EduToolsApp />);
    expect(screen.getByRole("button", { name: "7" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Científica" }));
    expect(screen.getByLabelText("Seno")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Básica" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ecuaciones" }));
    expect(await screen.findByRole("group", { name: "Teclado de ecuaciones" }, { timeout: 10000 })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Tabla periódica" }));
    expect(await screen.findByRole("searchbox", { name: "Buscar elemento" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Medir" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Lectura" })).toBeNull();
  }, 20000);

  it("calcula una suma con el ratón", async () => {
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar" }));
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    fireEvent.click(screen.getByRole("button", { name: "Igual" }));
    expect(await screen.findByText("15", { selector: ".calc-value" })).toBeTruthy();
  });

  it("calcula una suma con el teclado", async () => {
    render(<EduToolsApp />);
    for (const key of ["7", "+", "8", "Enter"]) fireEvent.keyDown(window, { key });
    expect(await screen.findByText("15", { selector: ".calc-value" })).toBeTruthy();
  });

  it("calcula funciones científicas", async () => {
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("button", { name: "Científica" }));
    fireEvent.click(screen.getByRole("button", { name: "Raíz cuadrada" }));
    fireEvent.click(screen.getByRole("button", { name: "9" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar paréntesis" }));
    fireEvent.click(screen.getByRole("button", { name: "Igual" }));
    expect(await screen.findByText("3", { selector: ".calc-value" })).toBeTruthy();
  });

  it("guarda la memoria y el historial de operaciones", async () => {
    render(<EduToolsApp />);
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
    render(<EduToolsApp />);
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
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("button", { name: "Ecuaciones" }));
    fireEvent.change(await screen.findByLabelText("Línea 1"), { target: { value: "x=5" } });
    fireEvent.change(screen.getByLabelText("Línea 2"), { target: { value: "y=2" } });
    fireEvent.change(screen.getByLabelText("Línea 3"), { target: { value: "x+y" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("= 7")).toBeTruthy();
    expect(screen.getByText("= 5")).toBeTruthy();
    expect(screen.getByText("= 2")).toBeTruthy();
  });

  it("cambia de vista con Alt+1 y Alt+2", async () => {
    render(<EduToolsApp />);
    fireEvent.keyDown(window, { key: "2", altKey: true });
    expect(screen.getByRole("tab", { name: "Tabla periódica" }).getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByRole("searchbox", { name: "Buscar elemento" })).toBeTruthy();

    fireEvent.keyDown(window, { key: "1", altKey: true });
    expect(screen.getByRole("tab", { name: "Calculadora" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "7" })).toBeTruthy();
  });

  it("busca en español y muestra la ficha del elemento", async () => {
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("tab", { name: "Tabla periódica" }));
    fireEvent.change(await screen.findByRole("searchbox", { name: "Buscar elemento" }), { target: { value: "sodio" } });
    expect(screen.getByRole("status").textContent).toBe("1 de 118");
    fireEvent.click(screen.getByRole("gridcell", { name: /Sodio/ }));
    expect(screen.getByText("Sodio")).toBeTruthy();
    expect(document.querySelector(".pt-detail-cat")?.textContent).toBe("Metal alcalino");
    expect(screen.getByRole("img", { name: "Modelo atómico de Na: 11 electrones en 3 capas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Descripción" }));
    expect(screen.getByText(/Sodio \(Na, número atómico 11\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Historia" }));
    expect(screen.getByText("Descubierto por")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver en Wikipedia" })).toBeTruthy();
  });

  it("filtra por bloque", async () => {
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("tab", { name: "Tabla periódica" }));
    fireEvent.change(await screen.findByLabelText("Bloque"), { target: { value: "f" } });
    expect(screen.getByRole("status").textContent).toBe("28 de 118");
  });

  it("marca los elementos con categoría predicha", async () => {
    render(<EduToolsApp />);
    fireEvent.click(screen.getByRole("tab", { name: "Tabla periódica" }));
    fireEvent.change(await screen.findByRole("searchbox", { name: "Buscar elemento" }), { target: { value: "oganeson" } });
    fireEvent.click(screen.getByRole("gridcell", { name: /Oganes/ }));
    expect(document.querySelector(".pt-detail-head.is-predicted")).toBeTruthy();
    expect(document.querySelector(".pt-detail-cat")?.textContent).toContain("predicha");
  });
});
