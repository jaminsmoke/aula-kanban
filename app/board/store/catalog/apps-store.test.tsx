import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AULA_STORE_VERSION } from "../tools";
import AppsStore, { type StoreApp } from "./apps-store";

const noop = () => {};
const native: StoreApp[] = [{ id: "excalidraw", status: "installed", url: null }];
const props = { role: "owner" as const, apps: native, error: "", onManage: vi.fn(), onOpen: noop, onRefresh: noop, onClose: noop };

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

  it("ya no muestra la pestaña Libros (STORE-04: los libros viven en la mochila)", () => {
    render(<AppsStore {...props} />);
    expect(screen.queryByRole("button", { name: /^Libros/ })).toBeNull();
    expect(screen.queryByLabelText("Vista de libros")).toBeNull();
    expect(screen.getByRole("region", { name: "Mejores aplicaciones" })).toBeTruthy();
  });

  it("muestra «Mejores aplicaciones» y las secciones por categoría en el inicio", () => {
    render(<AppsStore {...props} role="owner" />);
    expect(screen.getByRole("region", { name: "Mejores aplicaciones" })).toBeTruthy();
    for (const category of ["Educación", "Productividad", "Oficina"]) {
      expect(screen.getByRole("region", { name: category })).toBeTruthy();
    }
    // Oficina ya tiene Hoja de cálculo; no muestra el aviso de categoría vacía.
    expect(screen.queryByText("Más adelante: habrá más aplicaciones de Oficina.")).toBeNull();
    // Cada app aparece en «Mejores aplicaciones» y en su categoría.
    for (const name of ["Calculadora", "Tabla periódica", "Programación por bloques", "Ajedrez", "Hoja de cálculo", "Aula Documentos"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    for (const retired of ["Notas y documentos", "Presentaciones", "Visor Office"]) {
      expect(screen.queryByText(retired)).toBeNull();
    }
  });
  it("muestra la tarjeta de suite de Aula Documentos", () => {
    render(<AppsStore {...props} role="owner" />);
    expect(screen.getAllByText(/La suite documental del aula/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Notas · Diagramas · Presentaciones · Office").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Suite").length).toBeGreaterThan(0);
  });

  it("abre la ficha de suite de Aula Documentos y la cierra con Escape", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalles de Aula Documentos" })[0]);
    expect(screen.getByRole("dialog", { name: "Aula Documentos" })).toBeTruthy();
    expect(screen.getByText("Migración")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("busca por descripción, sin tildes y filtra instaladas", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "pizarra" } });
    expect(screen.getByText("Excalidraw")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "geometria" } });
    expect(screen.getByText("Geometría interactiva")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "  GEOMETRÍA  " } });
    expect(screen.getByText("Geometría interactiva")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "pizarra" } });
    fireEvent.click(screen.getByRole("button", { name: /Instaladas/ }));
    expect(screen.getByText("Excalidraw")).toBeTruthy();
  });
  it("agrupa cada categoría en galerías por subcategoría (STORE-03B)", () => {
    const { container } = render(<AppsStore {...props} role="owner" />);
    // En Todo: «Mejores» (1) + Educación (3) + Productividad (3) + Oficina (1) = 8 galerías.
    expect(container.querySelectorAll(".store-gallery")).toHaveLength(8);
    // Diagramas vive en Educación y en Productividad (vocabulario compartido).
    expect(screen.getAllByRole("group", { name: "Diagramas" })).toHaveLength(2);
    expect(screen.getAllByRole("group", { name: "Pizarras" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Educación/ }));
    expect(container.querySelectorAll(".store-gallery")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "Pizarras" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Diagramas" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Herramientas" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Programación" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Productividad/ }));
    expect(container.querySelectorAll(".store-gallery")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "Diagramas" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Programación" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Oficina/ }));
    expect(container.querySelectorAll(".store-gallery")).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Herramientas" })).toBeTruthy();
    expect(screen.getByText("Hoja de cálculo")).toBeTruthy();
    expect(screen.getByText("Aula Documentos")).toBeTruthy();
    expect(screen.queryByText("Notas y documentos")).toBeNull();
    expect(screen.queryByText("Visor Office")).toBeNull();
  });
  it("filtra por categoría y abre la ficha de detalle", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: /^Educación/ }));
    expect(screen.getByText("Calculadora")).toBeTruthy();
    expect(screen.getByText("Tabla periódica")).toBeTruthy();
    expect(screen.getByText("Excalidraw")).toBeTruthy();
    expect(screen.queryByText("Programación por bloques")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /Detalles/ })[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
