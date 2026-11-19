import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnsavedChangesDialog from "./unsaved-changes-dialog";

describe("aviso de cambios sin guardar", () => {
  it("ofrece seguir editando, guardar o descartar", () => {
    render(
      <UnsavedChangesDialog
        open
        onStay={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Cambios sin guardar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar y cerrar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar sin guardar" })).toBeTruthy();
  });

  it("delega las tres salidas y mantiene el foco en el aviso", () => {
    const onStay = vi.fn();
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        onStay={onStay}
        onDiscard={onDiscard}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar y cerrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sin guardar" }));

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("Escape permanece en el aviso y muestra un error si falla el guardado", () => {
    const onStay = vi.fn();
    const onDiscard = vi.fn();
    render(
      <UnsavedChangesDialog
        open
        notice="No se pudo guardar el borrador."
        onStay={onStay}
        onDiscard={onDiscard}
        onSave={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("No se pudo guardar el borrador.");
  });

  it("no se renderiza sin cambios pendientes", () => {
    render(<UnsavedChangesDialog open={false} onStay={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
