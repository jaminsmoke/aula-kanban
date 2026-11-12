import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DocumentationView from "./docs-view";
import { docSections } from "./docs-content";

describe("DocumentationView", () => {
  it("pinta el título y la introducción de la documentación", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Documentación de Aula Kanban" })).toBeTruthy();
    expect(screen.getByText("Cómo va el tablero, qué puede hacer cada rol y dónde están las herramientas del grupo.")).toBeTruthy();
  });

  it("vuelve al Kanban con el botón de vuelta", () => {
    const onBack = vi.fn();
    render(<DocumentationView onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Volver a Kanban/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("muestra el índice con anclas a cada sección del contenido", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const index = screen.getByRole("navigation", { name: "Secciones de la documentación" });
    for (const section of docSections) {
      const link = index.querySelector(`a[href="#docs-${section.id}"]`);
      expect(link?.textContent).toBe(section.title);
    }
  });

  it("muestra una ilustración por sección y una en el héroe", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Ilustración: tablero Kanban con columnas de tareas" })).toBeTruthy();
    for (const section of docSections) {
      expect(screen.getByRole("img", { name: "Ilustración: " + section.title })).toBeTruthy();
    }
  });

  it("renderiza todas las secciones con su título y bloques", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    for (const section of docSections) {
      expect(screen.getByRole("heading", { name: section.title })).toBeTruthy();
      expect(document.getElementById(`docs-${section.id}`)).toBeTruthy();
    }
    expect(screen.getByText(/tablero colaborativo del grupo de clase/)).toBeTruthy();
    expect(screen.getByText(/Nunca pegues contraseñas ni tokens/)).toBeTruthy();
  });
});
