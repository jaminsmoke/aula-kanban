import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("jsxgraph", () => {
  const create = vi.fn((type: string) => (
    type === "point"
      ? { X: () => 0, Y: () => 0 }
      : { show: vi.fn(), hide: vi.fn(), setAttribute: vi.fn() }
  ));
  const board = {
    create,
    on: vi.fn(),
    removeObject: vi.fn(),
    getUsrCoordsOfMouse: vi.fn(() => [0, 0]),
  };
  return {
    default: {
      JSXGraph: {
        initBoard: vi.fn(() => board),
        freeBoard: vi.fn(),
      },
    },
  };
});

import GeometriaApp from "./geometria-app";

describe("Geometría interactiva", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("crea una medida dinámica con los dos últimos puntos", () => {
    render(<GeometriaApp />);
    expect(screen.getByText("2 puntos · 1 elemento")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Medir" }));

    expect(screen.getByText("2 puntos · 2 elementos")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Medida dinámica añadida");
  });

  it("reinicia el lienzo y vuelve a la construcción inicial", () => {
    render(<GeometriaApp />);
    fireEvent.click(screen.getByRole("button", { name: "Medir" }));
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getByText("2 puntos · 1 elemento")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Lienzo reiniciado");
  });

  it("cambia de preset y conserva sus recuentos", () => {
    render(<GeometriaApp />);

    fireEvent.change(screen.getByLabelText("Construcción"), { target: { value: "triangulo" } });

    expect(screen.getByText("3 puntos · 3 elementos")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Preset Triángulo cargado");
  });

  it("superpone una función y permite ocultarla", () => {
    render(<GeometriaApp />);

    fireEvent.change(screen.getByLabelText("Función"), { target: { value: "parabola" } });
    expect(screen.getByText("y = 0,15x² − 2")).toBeTruthy();

    const toggle = screen.getByLabelText("Mostrar función") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);

    expect(screen.getByRole("status").textContent).toContain("Función oculta");
  });
});
