import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfficeViewerToolbar } from "./office-viewer-toolbar";
import VisorOfficeApp from "./office-viewer";

describe("Visor Office", () => {
  it("muestra el estado vacío y explica los formatos admitidos", () => {
    render(<VisorOfficeApp />);

    expect(screen.getByText("Visor Office")).toBeTruthy();
    expect(screen.getByText("Abre un documento de Office")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elegir archivo" })).toBeTruthy();
    expect(screen.getByText("Solo lectura")).toBeTruthy();
  });

  it("rechaza un archivo con formato no admitido", async () => {
    render(<VisorOfficeApp />);
    const input = screen.getByLabelText("Elegir archivo de Office");
    const file = new File(["contenido"], "nota.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Solo se admiten");
    });
  });

  it("activa navegación y zoom cuando hay un documento cargado", () => {
    const onNext = vi.fn();
    const onZoomIn = vi.fn();

    render(
      <OfficeViewerToolbar
        embedded={false}
        loaded={{
          info: { name: "clase.docx", size: 2048, format: "docx" },
          bytes: new ArrayBuffer(8),
          id: 1,
        }}
        canPrevious
        canNext
        canUseViewer
        position={{ label: "Página", current: 2, total: 3 }}
        scale={1.25}
        previousLabel="Página anterior"
        nextLabel="Página siguiente"
        onOpen={vi.fn()}
        onClose={vi.fn()}
        onPrevious={vi.fn()}
        onNext={onNext}
        onZoomOut={vi.fn()}
        onZoomIn={onZoomIn}
        onFitWidth={vi.fn()}
        onFitPage={vi.fn()}
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("Página 2 de 3");
    expect(screen.getByText("125 %")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it("oculta la apertura duplicada en modo embebido", () => {
    render(<VisorOfficeApp embedded />);

    expect(screen.queryByRole("button", { name: "Abrir archivo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Elegir archivo" })).toBeTruthy();
  });
});
