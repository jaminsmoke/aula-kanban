import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const revealMock = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  destroy: vi.fn(),
}));

vi.mock("reveal.js", () => ({
  default: class {
    initialize = revealMock.initialize;
    destroy = revealMock.destroy;
  },
}));

import PresentacionesApp from "./presentaciones-app";

describe("Presentaciones", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza la vista previa al editar el Markdown", () => {
    render(<PresentacionesApp />);
    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Nueva\n\nTexto\n\n---\n\n## Dos" },
    });

    expect(screen.getAllByText("2 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByText("Nueva")).toBeTruthy();
    expect(screen.getByText("Dos")).toBeTruthy();
  });

  it("abre y cierra el modo presentación", () => {
    const { container } = render(<PresentacionesApp />);
    fireEvent.click(screen.getByRole("button", { name: "Presentar" }));

    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(container.querySelectorAll(".presentaciones-slide")).toHaveLength(3);
    expect(revealMock.initialize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(screen.getByLabelText("Editor de diapositivas")).toBeTruthy();
    expect(revealMock.destroy).toHaveBeenCalledTimes(1);
  });

  it("reinicia el documento inicial", () => {
    render(<PresentacionesApp />);
    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Solo una" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain("Presentación reiniciada");
  });
});
