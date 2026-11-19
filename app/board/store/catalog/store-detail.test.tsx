import { render, screen } from "@testing-library/react";
import { Gem } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import type { StoreTool } from "../tools";
import StoreDetail from "./store-detail";

const tool: StoreTool = {
  id: "excalidraw",
  name: "Excalidraw",
  description: "Pizarra del espacio de trabajo.",
  tagline: "Dibuja y explica.",
  categories: ["Educación"],
  subcategory: "Pizarras",
  cover: "",
  features: ["Lienzo infinito"],
  appVersion: "1.0.0",
  upstream: { name: "@excalidraw/excalidraw", version: "0.18.1" },
  window: { width: 880, height: 560 },
  icon: Gem,
  roles: ["teacher"],
};

const props = {
  status: "not_installed",
  isAdmin: true,
  actions: <button type="button">Instalar</button>,
  onClose: vi.fn(),
};

describe("ficha técnica de Aula Store", () => {
  it("muestra la versión de integración y la base upstream", () => {
    render(<StoreDetail tool={tool} {...props} />);
    expect(screen.getByText("Versión de Excalidraw")).toBeTruthy();
    expect(screen.getByText("1.0.0")).toBeTruthy();
    expect(screen.getByText("@excalidraw/excalidraw 0.18.1")).toBeTruthy();
    expect(screen.queryByText("Ampliaciones")).toBeNull();
  });

  it("muestra las ampliaciones propias cuando la app las declara", () => {
    render(<StoreDetail
      tool={{
        ...tool,
        name: "Tabla periódica",
        upstream: { name: "@cortex-js/compute-engine", version: "0.188.0" },
        extras: [{ name: "blockly", version: "13.4.0" }],
      }}
      {...props}
    />);
    expect(screen.getByText("Versión de Tabla periódica")).toBeTruthy();
    expect(screen.getByText("@cortex-js/compute-engine 0.188.0")).toBeTruthy();
    expect(screen.getByText("Ampliaciones")).toBeTruthy();
    expect(screen.getByText("blockly 13.4.0")).toBeTruthy();
  });

  it("permite una etiqueta de versión distinta del nombre de la app", () => {
    render(<StoreDetail tool={{ ...tool, versionLabel: "EduTools" }} {...props} />);
    expect(screen.getByText("Versión de EduTools")).toBeTruthy();
  });

  it("omite upstream cuando la integración es propia", () => {
    render(<StoreDetail tool={{ ...tool, upstream: undefined }} {...props} />);
    expect(screen.queryByText("Upstream")).toBeNull();
  });

  it("muestra la ficha de suite con módulos, capacidades, formatos y migración", () => {
    render(<StoreDetail
      tool={{
        ...tool,
        id: "aula-documentos",
        name: "Aula Documentos",
        description: "Suite documental con notas, diagramas, presentaciones y Office.",
        tagline: "La suite documental del aula.",
        categories: ["Oficina", "Productividad"],
        cover: "",
        features: [],
        appVersion: "1.2.0",
        suite: {
          promise: "La suite documental del aula: texto, diagramas, presentaciones y Office en un mismo proyecto.",
          modules: ["Notas", "Diagramas", "Presentaciones", "Office"],
          capabilities: [
            { title: "Escritura", items: ["Texto enriquecido y tablas"] },
            { title: "Diagramas", items: ["Bloques Mermaid con plantillas"] },
            { title: "Presentaciones", items: ["Modo presentación y notas"] },
            { title: "Office e intercambio", items: ["Visor local de DOCX, XLSX y PPTX"] },
          ],
          formats: {
            open: ["DOCX", "XLSX", "PPTX", "Markdown"],
            export: ["HTML", "Markdown", "DOCX", "PPTX"],
          },
          migration: {
            replaces: [
              { id: "documentos", name: "Notas y documentos" },
              { id: "mermaid", name: "Diagramas" },
              { id: "presentaciones", name: "Presentaciones" },
              { id: "visor-office", name: "Visor Office" },
            ],
            note: "Las cuatro apps se integran aquí. Usa Archivo > Migrar apps antiguas.",
          },
        },
      }}
      {...props}
    />);

    expect(screen.getByText(/La suite documental del aula/)).toBeTruthy();
    expect(screen.getByLabelText("Módulos incluidos").textContent).toContain("Notas");
    expect(screen.getByText("Escritura")).toBeTruthy();
    expect(screen.getAllByText("Diagramas").length).toBeGreaterThan(0);
    expect(screen.getByText("Abre")).toBeTruthy();
    expect(screen.getByText("Exporta")).toBeTruthy();
    expect(screen.getAllByText("DOCX").length).toBeGreaterThan(0);
    expect(screen.getByText("Migración")).toBeTruthy();
    expect(screen.getByLabelText("Apps sustituidas").textContent).toContain("Visor Office");
    expect(screen.getByText("Ficha técnica")).toBeTruthy();
    expect(screen.getByText("Versión de Aula Documentos")).toBeTruthy();
    expect(screen.queryByText("Lienzo infinito")).toBeNull();
  });

  it("muestra capturas de suite cuando existen", () => {
    render(<StoreDetail
      tool={{
        ...tool,
        id: "aula-documentos",
        name: "Aula Documentos",
        suite: {
          promise: "Una suite con capturas.",
          modules: ["Notas"],
          capabilities: [{ title: "Escritura", items: ["Texto"] }],
          formats: { open: ["DOCX"], export: ["HTML"] },
          screenshots: [{
            src: "/capturas/aula-documentos-suite.webp",
            alt: "Documento de Aula con texto y diapositivas",
            caption: "Editor y presentación en el mismo documento",
          }],
        },
      }}
      {...props}
    />);

    const image = screen.getByRole("img", { name: "Documento de Aula con texto y diapositivas" });
    expect(image.getAttribute("src")).toBe("/capturas/aula-documentos-suite.webp");
    expect(screen.getByText("Editor y presentación en el mismo documento")).toBeTruthy();
  });
});
