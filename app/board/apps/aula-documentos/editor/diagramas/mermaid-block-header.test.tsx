import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MermaidBlockHeader } from "./mermaid-block-header";

const baseProps = {
  readOnly: false,
  canApply: true,
  canRestore: true,
  canMoveUp: true,
  canMoveDown: true,
  canExportSvg: true,
  onApplyTemplate: vi.fn(),
  onCopy: vi.fn(),
  onDownloadSvg: vi.fn(),
  onRestore: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
  onApply: vi.fn(),
  onCancel: vi.fn(),
  onStartEditing: vi.fn(),
  onDelete: vi.fn(),
};

describe("cabecera del bloque Mermaid", () => {
  it("ofrece plantillas y acciones de edición", () => {
    render(<MermaidBlockHeader {...baseProps} editing={false} />);

    fireEvent.change(screen.getByLabelText("Insertar plantilla Mermaid"), { target: { value: "flujo" } });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Copiar código Mermaid" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover diagrama arriba" }));

    expect(baseProps.onApplyTemplate).toHaveBeenCalledWith("flujo");
    expect(baseProps.onStartEditing).toHaveBeenCalledTimes(1);
    expect(baseProps.onCopy).toHaveBeenCalledTimes(1);
    expect(baseProps.onMoveUp).toHaveBeenCalledTimes(1);
  });

  it("muestra aplicar y descartar mientras se edita", () => {
    render(<MermaidBlockHeader {...baseProps} editing />);

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar diagrama" }));

    expect(baseProps.onApply).toHaveBeenCalledTimes(1);
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    expect(baseProps.onDelete).toHaveBeenCalledTimes(1);
  });
});
