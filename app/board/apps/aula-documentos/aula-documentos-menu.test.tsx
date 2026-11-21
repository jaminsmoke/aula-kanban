import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AulaMenu, type AulaMenuAction } from "./aula-documentos-menu";

/**
 * Crea una acción de menú para las pruebas.
 * @param label - Etiqueta visible.
 * @param overrides - Estados o acción que se quieren cambiar.
 * @returns La acción del menú.
 */
function action(label: string, overrides: Partial<AulaMenuAction> = {}): AulaMenuAction {
  return {
    id: label,
    label,
    icon: <span aria-hidden>·</span>,
    onSelect: vi.fn(),
    ...overrides,
  };
}

describe("menú de Aula Documentos", () => {
  it("muestra las acciones con sus estados y devuelve el foco al cerrar", () => {
    const actions = [
      action("Nuevo documento"),
      action("Importar documento", { disabled: true }),
      action("Negrita", { active: true }),
    ];
    render(<AulaMenu label="Archivo" actions={actions} />);

    const trigger = screen.getByRole("button", { name: "Archivo" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Archivo" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Nuevo documento" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Importar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("menuitemcheckbox", { name: "Negrita" }).getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Nuevo documento" }));

    fireEvent.keyDown(screen.getByRole("menu", { name: "Archivo" }), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Archivo" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("recorre las acciones con flechas y ejecuta la elegida", () => {
    const onSelect = vi.fn();
    const actions = [
      action("Primera", { onSelect }),
      action("Segunda"),
    ];
    render(<AulaMenu label="Insertar" actions={actions} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Insertar" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("menu", { name: "Insertar" }), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Segunda" }));

    fireEvent.click(screen.getByRole("menuitem", { name: "Primera" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "Insertar" })).toBeNull();
  });

  it("se cierra al pulsar fuera", () => {
    render(<AulaMenu label="Exportar" actions={[action("HTML")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(screen.getByRole("menu", { name: "Exportar" })).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu", { name: "Exportar" })).toBeNull();
  });
});
