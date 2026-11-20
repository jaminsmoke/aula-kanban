import { fireEvent, render, screen } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import { describe, expect, it, vi } from "vitest";
import StoreWindow from "./store-window";

type GeometryProps = {
  position: { x: number; y: number };
  size: { width: number; height: number };
};

const callbacks = {
  onMove: vi.fn(),
  onResize: vi.fn(),
  onFocus: vi.fn(),
  onClose: vi.fn(),
  onMinimize: vi.fn(),
  onZoom: vi.fn(),
};

/**
 * Ventana de prueba con un control para comprobar foco y contenido.
 * @param props - Posición y tamaño de la ventana.
 * @returns La ventana con un campo de texto.
 */
function WindowHarness({ position, size }: GeometryProps) {
  return (
    <LazyMotion features={domAnimation}>
      <StoreWindow
        title="Prueba"
        position={position}
        size={size}
        bounds={{ width: 1200, height: 700 }}
        zIndex={1}
        maximized={false}
        minimized={false}
        {...callbacks}
      >
        <input aria-label="Contenido" defaultValue="texto" />
      </StoreWindow>
    </LazyMotion>
  );
}

describe("ventana de la Tienda", () => {
  it("conserva el contenido y el foco al cambiar la geometría", () => {
    const { rerender } = render(
      <WindowHarness position={{ x: 100, y: 80 }} size={{ width: 900, height: 600 }} />,
    );
    const input = screen.getByLabelText("Contenido") as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "texto editado" } });

    rerender(<WindowHarness position={{ x: 12, y: 12 }} size={{ width: 366, height: 600 }} />);

    expect(screen.getByLabelText("Contenido")).toBe(input);
    expect(input.value).toBe("texto editado");
    expect(document.activeElement).toBe(input);
  });

  it("muestra el icono de la app en la barra de título", () => {
    render(
      <LazyMotion features={domAnimation}>
        <StoreWindow
          title="Aula Documentos"
          icon={<span data-testid="app-icon" />}
          position={{ x: 0, y: 0 }}
          size={{ width: 900, height: 600 }}
          bounds={{ width: 1200, height: 700 }}
          zIndex={1}
          maximized={false}
          minimized={false}
          {...callbacks}
        >
          <div />
        </StoreWindow>
      </LazyMotion>,
    );

    expect(screen.getByTestId("app-icon")).toBeTruthy();
    expect(screen.getByText("Aula Documentos")).toBeTruthy();
  });

  it("no permite que el arrastre deje la ventana fuera del escritorio", () => {
    const { container } = render(
      <WindowHarness position={{ x: 100, y: 100 }} size={{ width: 900, height: 600 }} />,
    );
    const titlebar = container.querySelector(".store-window-titlebar");
    expect(titlebar).toBeTruthy();

    fireEvent.pointerDown(titlebar as Element, { clientX: 200, clientY: 120 });
    fireEvent.pointerMove(window, { clientX: -500, clientY: -500 });
    fireEvent.pointerUp(window);

    expect(callbacks.onMove).toHaveBeenLastCalledWith({ x: 12, y: 12 });
  });
});
