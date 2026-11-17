import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const revealMock = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  destroy: vi.fn(),
}));

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
}));

vi.mock("reveal.js", () => ({
  default: class {
    initialize = revealMock.initialize;
    destroy = revealMock.destroy;
  },
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    loading: false,
    error: null,
  }),
}));

import PresentacionesApp from "./presentaciones-app";

const props = { projectId: "p1", role: "owner" as const };

describe("Presentaciones", () => {
  afterEach(() => {
    vi.clearAllMocks();
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });

  it("actualiza la vista previa al editar el Markdown", () => {
    render(<PresentacionesApp {...props} />);
    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Nueva\n\nTexto\n\n---\n\n## Dos" },
    });

    expect(screen.getAllByText("2 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByText("Nueva")).toBeTruthy();
    expect(screen.getByText("Dos")).toBeTruthy();
  });

  it("abre y cierra el modo presentación", () => {
    const { container } = render(<PresentacionesApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Presentar" }));

    expect(screen.getByRole("button", { name: "Salir" })).toBeTruthy();
    expect(container.querySelectorAll(".presentaciones-slide")).toHaveLength(3);
    expect(revealMock.initialize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(screen.getByLabelText("Editor de diapositivas")).toBeTruthy();
    expect(revealMock.destroy).toHaveBeenCalledTimes(1);
  });

  it("reinicia el documento inicial", () => {
    render(<PresentacionesApp {...props} />);
    fireEvent.change(screen.getByLabelText("Editor de diapositivas"), {
      target: { value: "# Solo una" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getAllByText("3 diapositivas").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain("Presentación reiniciada");
  });

  it("aplica la plantilla de proyecto", () => {
    render(<PresentacionesApp {...props} />);
    fireEvent.change(screen.getByLabelText("Plantilla"), { target: { value: "proyecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByText("Presentación del proyecto")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Plantilla «Proyecto» aplicada");
  });

  it("guarda la presentación en el proyecto", async () => {
    render(<PresentacionesApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    expect(documentMock.save.mock.calls[0][0]).toEqual({ markdown: expect.stringContaining("Nuestra presentación") });
    expect(screen.getByRole("status").textContent).toContain("Presentación guardada");
  });

  it("deja la presentación en solo lectura para invitados", () => {
    render(<PresentacionesApp projectId="p1" role="guest" />);
    expect(screen.getByLabelText("Editor de diapositivas")).toHaveProperty("readOnly", true);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
  });
});
