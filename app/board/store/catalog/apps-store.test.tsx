import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AULA_STORE_VERSION } from "../tools";
import AppsStore, { type StoreApp } from "./apps-store";

const noop = () => {};
const native: StoreApp[] = [{ id: "excalidraw", status: "installed", url: null }];
const props = { role: "owner" as const, projectId: "p1", apps: native, error: "", onManage: vi.fn(), onOpen: noop, onRefresh: noop, onClose: noop };

describe("Aula Store", () => {
  it("permite al administrador desinstalar Excalidraw", () => {
    const manage = vi.fn();
    const { container } =    render(<AppsStore {...props} onManage={manage} />);
    expect(container.querySelector(".store-catalog")).toBeTruthy();
    expect(container.querySelector(".store-view")).toBeNull();
    // Excalidraw está en «Mejores aplicaciones» y en su categoría.
    expect(screen.getAllByRole("button", { name: /Desinstalar/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /Desinstalar/ })[0]);
    expect(manage).toHaveBeenCalledWith("excalidraw", "uninstall");
    expect(screen.getByText(`v${AULA_STORE_VERSION}`)).toBeTruthy();
    expect(screen.queryByText(/VPS/)).toBeNull();
  });
  it("permite al alumnado abrir sin gestionar", () => {
    render(<AppsStore {...props} role="student" />);
    expect(screen.getAllByRole("button", { name: /Abrir/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Desinstalar/ })).toBeNull();
  });

  it("activa la pestaña Libros y muestra la vista de libros", () => {
    render(<AppsStore {...props} />);
    const appsTab = screen.getByRole("button", { name: "Aplicaciones" });
    expect(appsTab.getAttribute("aria-current")).toBe("page");
    const booksTab = screen.getByRole("button", { name: /Libros/ });
    expect((booksTab as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(booksTab);
    expect(booksTab.getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText("Vista de libros")).toBeTruthy();
    fireEvent.click(appsTab);
    expect(screen.queryByLabelText("Vista de libros")).toBeNull();
  });

  it("muestra «Mejores aplicaciones» y las secciones por categoría en el inicio", () => {
    render(<AppsStore {...props} role="owner" />);
    expect(screen.getByRole("region", { name: "Mejores aplicaciones" })).toBeTruthy();
    for (const category of ["Aula", "Pizarras", "Programación", "Diagramas"]) {
      expect(screen.getByRole("region", { name: category })).toBeTruthy();
    }
    // Cada app aparece en «Mejores aplicaciones» y en su categoría.
    for (const name of ["Herramientas de aula", "Programación por bloques", "Diagramas"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
  it("busca por descripción y filtra instaladas", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "pizarra" } });
    expect(screen.getByText("Excalidraw")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Instaladas/ }));
    expect(screen.getByText("Excalidraw")).toBeTruthy();
  });
  it("filtra por categoría y abre la ficha de detalle", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: /^Aula/ }));
    expect(screen.getByText("Herramientas de aula")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /Detalles/ })[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
