import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MermaidCanvasView from "./mermaid-canvas-view";

const SVG = '<svg viewBox="0 0 100 50"><g><rect width="100" height="50" /></g></svg>';

describe("vista interactiva de Diagramas", () => {
  it("muestra el lienzo y los controles de zoom", () => {
    render(<MermaidCanvasView svg={SVG} error={null} />);

    expect(screen.getByRole("region", { name: "Lienzo del diagrama" })).toBeTruthy();
    expect(screen.getByText("Vista previa")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acercar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alejar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajustar al lienzo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pantalla completa" })).toBeTruthy();
  });

  it("cambia el zoom con botones y teclado", () => {
    render(<MermaidCanvasView svg={SVG} error={null} />);
    const canvas = screen.getByRole("region", { name: "Lienzo del diagrama" });

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(screen.getByText("125%")).toBeTruthy();

    fireEvent.keyDown(canvas, { key: "+" });
    expect(screen.getByText("156%")).toBeTruthy();

    fireEvent.keyDown(canvas, { key: "0" });
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.keyDown(canvas, { key: "-" });
    expect(screen.getByText("80%")).toBeTruthy();
  });

  it("entra en pantalla completa y sale con Escape", async () => {
    render(<MermaidCanvasView svg={SVG} error={null} />);
    const toggle = screen.getByRole("button", { name: "Pantalla completa" });

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Salir de pantalla completa" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("region", { name: "Lienzo del diagrama" }).closest(".mermaid-preview")?.className)
      .toContain("is-fullscreen");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salir de pantalla completa" })).toBeNull());
    expect(screen.getByRole("button", { name: "Pantalla completa" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Lienzo del diagrama" })).toBeTruthy();
  });

  it("deja el lienzo vacío cuando no hay SVG", () => {
    render(<MermaidCanvasView svg="" error={null} />);

    expect(screen.getByText("El diagrama aparecerá aquí.")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acercar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Pantalla completa" })).toHaveProperty("disabled", true);
  });

  it("muestra el error de Mermaid en la cabecera", () => {
    render(<MermaidCanvasView svg="" error="No se pudo dibujar el diagrama." />);
    expect(screen.getByRole("alert").textContent).toContain("No se pudo dibujar el diagrama.");
  });
});
