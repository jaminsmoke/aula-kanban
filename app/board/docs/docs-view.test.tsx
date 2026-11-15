import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import DocumentationView from "./docs-view";
import { docAnchor, docSectionIds, docSections, docsHero } from "./content";
import { sectionVisuals } from "./section-visuals";

describe("DocumentationView", () => {
  it("pinta el título y la introducción de la documentación", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Documentación de Aula Kanban" })).toBeTruthy();
    expect(screen.getByText(docsHero.intro)).toBeTruthy();
  });

  it("vuelve a Clase con el botón de vuelta", () => {
    const onBack = vi.fn();
    render(<DocumentationView onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /Volver a Clase/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("muestra el índice con anclas a cada sección y marca la activa", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const index = screen.getByRole("navigation", { name: "Secciones de la documentación" });
    for (const section of docSections) {
      const link = within(index).getByRole("link", { name: section.title });
      expect(link.getAttribute("href")).toBe(`#${docAnchor(section.id)}`);
    }
    expect(index.querySelectorAll("a[aria-current]")).toHaveLength(1);
  });

  it("al usar el índice lleva a la sección y deja el foco en su título", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    onTestFinished(() => { Element.prototype.scrollIntoView = original; });
    render(<DocumentationView onBack={vi.fn()} />);

    const target = docSections[2];
    fireEvent.click(screen.getByRole("link", { name: target.title }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: target.title }));
  });

  it("da a cada ilustración (héroe y secciones) un nombre accesible propio", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const images = screen.getAllByRole("img");
    const illustrations = images.filter((image) => image.getAttribute("aria-labelledby"));
    expect(illustrations).toHaveLength(docSections.length + 1);
    const names = illustrations.map((image) => document.getElementById(image.getAttribute("aria-labelledby")!)?.textContent);
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(names.length);

    const screenshots = images.filter((image) => !image.getAttribute("aria-labelledby"));
    expect(screenshots.length).toBeGreaterThan(0);
    for (const screenshot of screenshots) expect(screenshot.getAttribute("alt")?.length).toBeGreaterThan(20);
  });

  it("renderiza todas las secciones con su título, entradilla y bloques", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    for (const section of docSections) {
      expect(screen.getByRole("heading", { level: 2, name: section.title })).toBeTruthy();
      expect(document.getElementById(docAnchor(section.id))).toBeTruthy();
      expect(screen.getByText(section.lead)).toBeTruthy();
    }
    expect(screen.getByText(/tablero colaborativo del grupo de clase/)).toBeTruthy();
    expect(screen.getByText(/Nunca pegues contraseñas ni tokens/)).toBeTruthy();
  });

  it("muestra los roles como términos con su descripción y las notas con su tono", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const roles = screen.getByRole("region", { name: "Roles y permisos" });
    expect(within(roles).getByText("Profesor").tagName).toBe("DT");
    const warnings = screen.getAllByRole("note", { name: "Importante" });
    expect(warnings.length).toBeGreaterThan(1);
    expect(warnings.some((note) => note.textContent?.match(/contraseñas/))).toBe(true);
    const tips = screen.getAllByRole("note", { name: "Consejo" });
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.some((note) => note.textContent?.match(/Tab hasta el asa/))).toBe(true);
  });
});

describe("sección Servidor MCP", () => {
  it("muestra el bloque JSON de configuración del cliente", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const section = screen.getByRole("region", { name: "Servidor MCP" });
    expect(within(section).getByText(/también escucha a herramientas de inteligencia artificial/)).toBeTruthy();
    const code = within(section).getByText(/"mcpServers"/, { exact: false });
    expect(code.textContent).toContain("Authorization");
  });
});

describe("sección Autorización OAuth", () => {
  it("muestra el bloque JSON de conexión y los alcances", () => {
    render(<DocumentationView onBack={vi.fn()} />);

    const section = screen.getByRole("region", { name: "Autorización OAuth" });
    expect(within(section).getByText(/desactivada en producción/)).toBeTruthy();
    const code = within(section).getByText(/"authorization_url"/, { exact: false });
    expect(code.textContent).toContain("/oauth/authorize");
    expect(code.textContent).toContain("mcp:read mcp:write");
    expect(within(section).getByText(/tokens personales del MCP siguen funcionando/)).toBeTruthy();
  });
});

describe("contenido de la documentación", () => {
  it("tiene una sección por id, sin duplicados y con su visual", () => {
    expect(docSections.map((section) => section.id)).toEqual([...docSectionIds]);
    for (const id of docSectionIds) {
      expect(sectionVisuals[id].Illustration).toBeTypeOf("function");
      expect(sectionVisuals[id].icon).toBeTruthy();
    }
  });
});
