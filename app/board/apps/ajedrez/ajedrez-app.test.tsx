import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AjedrezApp from "./ajedrez-app";

/**
 * Casilla del tablero de react-chessboard.
 * @param container - Contenedor renderizado.
 * @param square - Identificador algebraico.
 * @returns El elemento de la casilla.
 */
function square(container: HTMLElement, square: string): Element {
  const element = container.querySelector(`[data-square="${square}"]`);
  if (!element) throw new Error(`No se encontró la casilla ${square}`);
  return element;
}

function status(container: HTMLElement): Element {
  const element = container.querySelector(".ajedrez-status");
  if (!element) throw new Error("No se encontró el estado de la partida");
  return element;
}

describe("Ajedrez", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("mueve con clic, cambia el turno y registra la jugada", () => {
    const { container } = render(<AjedrezApp />);
    expect(status(container).textContent).toContain("Turno de las blancas.");

    fireEvent.click(square(container, "e2"));
    fireEvent.click(square(container, "e4"));

    expect(status(container).textContent).toContain("Turno de las negras.");
    expect(screen.getByLabelText("Historial de jugadas").textContent).toContain("e4");
    expect(screen.getByLabelText("Historial de jugadas").textContent).toContain("1");
  });

  it("ignora un movimiento ilegal y permite seguir jugando", () => {
    const { container } = render(<AjedrezApp />);

    fireEvent.click(square(container, "e2"));
    fireEvent.click(square(container, "e5"));
    expect(status(container).textContent).toContain("Turno de las blancas.");

    fireEvent.click(square(container, "e2"));
    fireEvent.click(square(container, "e4"));
    expect(status(container).textContent).toContain("Turno de las negras.");
  });

  it("reinicia la partida y vacía el historial", () => {
    const { container } = render(<AjedrezApp />);
    fireEvent.click(square(container, "e2"));
    fireEvent.click(square(container, "e4"));
    fireEvent.click(screen.getByRole("button", { name: "Nueva partida" }));

    expect(status(container).textContent).toContain("Turno de las blancas.");
    expect(screen.getByLabelText("Historial de jugadas").textContent).toContain("Aún no hay jugadas.");
  });

  it("permite mover con el formulario de teclado", () => {
    const { container } = render(<AjedrezApp />);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "e2" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "e4" } });
    fireEvent.click(screen.getByRole("button", { name: "Mover" }));

    expect(status(container).textContent).toContain("Turno de las negras.");
    expect(screen.getByLabelText("Historial de jugadas").textContent).toContain("e4");
  });

  it("hace mover al rival aleatorio con un movimiento legal", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container } = render(<AjedrezApp />);
    fireEvent.click(screen.getByRole("button", { name: "Rival aleatorio" }));
    fireEvent.click(square(container, "e2"));
    fireEvent.click(square(container, "e4"));
    expect(status(container).textContent).toContain("El rival está pensando…");

    act(() => vi.advanceTimersByTime(500));

    expect(status(container).textContent).toContain("Turno de las blancas.");
    expect(screen.getByLabelText("Historial de jugadas").textContent).toContain("2");
  });
});
