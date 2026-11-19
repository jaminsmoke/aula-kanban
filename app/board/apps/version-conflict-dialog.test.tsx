import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VersionConflictDialog from "./version-conflict-dialog";

describe("diálogo de conflicto de versión", () => {
  it("muestra el conflicto y las tres salidas", () => {
    render(
      <VersionConflictDialog
        open
        serverUpdatedAt={Date.UTC(2026, 10, 19, 10, 30)}
        notice={null}
        busy={false}
        onDownload={vi.fn()}
        onReload={vi.fn()}
        onKeepMine={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Conflicto de versión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Descargar copia/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recargar versión del servidor" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Conservar la mía" })).toBeTruthy();
    expect(screen.getByText(/Versión del servidor:/)).toBeTruthy();
  });

  it("confirma antes de sobrescribir la versión del servidor", () => {
    const onKeepMine = vi.fn();
    render(
      <VersionConflictDialog
        open
        serverUpdatedAt={null}
        notice={null}
        busy={false}
        onDownload={vi.fn()}
        onReload={vi.fn()}
        onKeepMine={onKeepMine}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Conservar la mía" }));
    expect(screen.getByText(/Los cambios de la otra sesión se perderán/)).toBeTruthy();
    expect(onKeepMine).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Descargar copia y sobrescribir" }));
    expect(onKeepMine).toHaveBeenCalledTimes(1);
  });

  it("delega la descarga y la recarga de la versión del servidor", () => {
    const onDownload = vi.fn();
    const onReload = vi.fn();
    render(
      <VersionConflictDialog
        open
        serverUpdatedAt={10}
        notice="Copia descargada."
        busy={false}
        onDownload={onDownload}
        onReload={onReload}
        onKeepMine={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Descargar copia/ }));
    fireEvent.click(screen.getByRole("button", { name: "Recargar versión del servidor" }));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Copia descargada.");
  });

  it("no se renderiza sin conflicto y bloquea las acciones mientras guarda", () => {
    const { rerender } = render(
      <VersionConflictDialog
        open={false}
        serverUpdatedAt={null}
        notice={null}
        busy={false}
        onDownload={vi.fn()}
        onReload={vi.fn()}
        onKeepMine={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <VersionConflictDialog
        open
        serverUpdatedAt={null}
        notice={null}
        busy
        onDownload={vi.fn()}
        onReload={vi.fn()}
        onKeepMine={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Descargar copia/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Recargando/ }).hasAttribute("disabled")).toBe(true);
  });

  it("devuelve el foco al control de origen al cerrar", () => {
    const props = {
      serverUpdatedAt: null,
      notice: null,
      busy: false,
      onDownload: vi.fn(),
      onReload: vi.fn(),
      onKeepMine: vi.fn(),
    };
    const { rerender } = render(<button type="button">Origen</button>);
    const origin = screen.getByRole("button", { name: "Origen" });
    origin.focus();

    rerender(
      <>
        <button type="button">Origen</button>
        <VersionConflictDialog open {...props} />
      </>,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Descargar copia/ }));

    rerender(
      <>
        <button type="button">Origen</button>
        <VersionConflictDialog open={false} {...props} />
      </>,
    );
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Origen" }));
  });
});
