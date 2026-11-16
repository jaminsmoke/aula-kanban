import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SettingsPermissions from "./settings-permissions";

describe("Ajustes > Permisos", () => {
  it("muestra las capacidades de instancia y quién las posee", () => {
    render(<SettingsPermissions />);

    expect(screen.getByRole("heading", { name: "Permisos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Instalar y desinstalar apps" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Administrar administradores" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Gestionar proyectos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Consultas sin proyecto" })).toBeTruthy();
    // Las capacidades de proyecto pertenecen a la pestaña de Administración.
    expect(screen.queryByRole("heading", { name: "Asignar libros" })).toBeNull();
    expect(screen.getAllByText("Dueño de la instancia · Administración")).toHaveLength(3);
    expect(screen.getByText("Cualquier cuenta")).toBeTruthy();
  });

  it("es de solo lectura: no ofrece controles de concesión", () => {
    render(<SettingsPermissions />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    expect(screen.getByText(/nunca las concede/)).toBeTruthy();
  });
});
