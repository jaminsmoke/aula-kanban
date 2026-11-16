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
        name: "Herramientas de aula",
        upstream: { name: "@cortex-js/compute-engine", version: "0.188.0" },
        extras: [{ name: "blockly", version: "13.4.0" }],
      }}
      {...props}
    />);
    expect(screen.getByText("Versión de Herramientas de aula")).toBeTruthy();
    expect(screen.getByText("@cortex-js/compute-engine 0.188.0")).toBeTruthy();
    expect(screen.getByText("Ampliaciones")).toBeTruthy();
    expect(screen.getByText("blockly 13.4.0")).toBeTruthy();
  });

  it("permite una etiqueta de versión distinta del nombre de la app", () => {
    render(<StoreDetail tool={{ ...tool, versionLabel: "EduTools" }} {...props} />);
    expect(screen.getByText("Versión de EduTools")).toBeTruthy();
  });
});
