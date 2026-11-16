import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PersonalSpaceView from "./personal-space-view";
import { jsonResponse } from "../../../vitest.setup";

const installed = [
  { id: "excalidraw", name: "Excalidraw", tagline: "Pizarra colaborativa para dibujar, explicar y anotar.", category: "Pizarras", favorite: true, position: 0 },
  { id: "mermaid", name: "Diagramas", tagline: "Escribe el diagrama en texto y míralo al instante.", category: "Diagramas", favorite: false, position: 1 },
];

function mockFetch() {
  return vi.fn(async () => jsonResponse({ apps: installed }));
}

describe("PersonalSpaceView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("es un escritorio con los iconos en el orden personal, sin tienda", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);

    const desktop = await screen.findByLabelText("Escritorio personal");
    expect(desktop).toBeTruthy();
    expect(screen.getByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Diagramas/ })).toBeTruthy();
    // Sin tienda: no hay catálogo ni botón de Aula Store.
    expect(screen.queryByRole("button", { name: /Aula Store/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Aula Store" })).toBeNull();
  });

  it("abre la ventana de la app al pulsar su icono", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: /Excalidraw/ }));
    expect(await screen.findByRole("dialog", { name: "Excalidraw" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar Excalidraw" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Minimizar Excalidraw" })).toBeTruthy();
  });

  it("usa «Maletín docente» para el profesorado", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="teacher" projectId="p1" />);
    expect(await screen.findByLabelText("Maletín docente")).toBeTruthy();
  });

  it("muestra el estado vacío sin herramientas instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ apps: [] })));
    render(<PersonalSpaceView role="student" projectId="p1" />);
    expect(await screen.findByText(/Todavía no hay herramientas instaladas/)).toBeTruthy();
  });

  it("muestra un error sin listas vacías", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin conexión"); }));
    render(<PersonalSpaceView role="student" projectId="p1" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No se pudieron consultar tus herramientas");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
  });
});
