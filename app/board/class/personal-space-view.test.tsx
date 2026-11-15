import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PersonalSpaceView from "./personal-space-view";

const installed = [
  { id: "excalidraw", name: "Excalidraw", tagline: "Pizarra colaborativa.", category: "Pizarras", favorite: true, position: 0 },
  { id: "mermaid", name: "Diagramas", tagline: "Diagramas en texto.", category: "Diagramas", favorite: false, position: 1 },
];

function mockFetch() {
  return vi.fn(async (url: string, init?: { method?: string }) => {
    if (init?.method === "PUT") {
      return { ok: true, json: async () => ({ apps: installed }) } as Response;
    }
    return { ok: true, json: async () => ({ apps: installed }) } as Response;
  });
}

describe("PersonalSpaceView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra el título según el rol y lista favoritas y disponibles", async () => {
    const onOpenApp = vi.fn();
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="student" projectId="p1" onOpenApp={onOpenApp} />);

    expect(await screen.findByRole("heading", { name: "Mi mochila" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Favoritas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Todas las disponibles" })).toBeTruthy();
    expect(await screen.findByText("Excalidraw")).toBeTruthy();
    expect(await screen.findByText("Diagramas")).toBeTruthy();
  });

  it("usa «Maletín docente» para el profesorado", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PersonalSpaceView role="teacher" projectId="p1" onOpenApp={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Maletín docente" })).toBeTruthy();
  });

  it("abre la app en Tienda y guarda al marcar favorita", async () => {
    const onOpenApp = vi.fn();
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonalSpaceView role="student" projectId="p1" onOpenApp={onOpenApp} />);

    const openButtons = await screen.findAllByRole("button", { name: "Abrir" });
    fireEvent.click(openButtons[0]);
    expect(onOpenApp).toHaveBeenCalledWith("excalidraw");

    fireEvent.click(screen.getByRole("button", { name: "Añadir Diagramas a favoritos" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/personal-apps?project=p1",
      expect.objectContaining({ method: "PUT" }),
    ));
  });
});
