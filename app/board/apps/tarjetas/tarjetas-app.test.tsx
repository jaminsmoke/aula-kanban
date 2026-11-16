import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../vitest.setup";
import TarjetasApp from "./tarjetas-app";

describe("Tarjetas de repaso", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("crea un mazo, añade una tarjeta y guarda el documento", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ state: null, updatedAt: null }))
      .mockResolvedValueOnce(jsonResponse({ accepted: true, updatedAt: 10 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<TarjetasApp projectId="p1" role="owner" />);
    expect(await screen.findByText("Crea tu primer mazo")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Nombre del mazo"), { target: { value: "Vocabulario" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear mazo" }));
    expect(screen.getAllByText("Vocabulario").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Anverso"), { target: { value: "casa" } });
    fireEvent.change(screen.getByLabelText("Reverso"), { target: { value: "house" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir tarjeta" }));
    expect(screen.getByText("casa")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/app-documents?project=p1&app=tarjetas",
      expect.objectContaining({ method: "POST" }),
    ));
    expect(await screen.findByText("Guardado en el proyecto.")).toBeTruthy();
  });

  it("repasa una tarjeta y guarda el progreso en el navegador", async () => {
    const state = {
      version: 1,
      decks: [{
        id: "d1",
        name: "Vocabulario",
        createdAt: "2026-11-16T00:00:00.000Z",
        cards: [{ id: "c1", front: "casa", back: "house", createdAt: "2026-11-16T00:00:00.000Z" }],
      }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ state, updatedAt: 1 })));
    const { unmount } = render(<TarjetasApp projectId="p1" role="owner" />);

    const review = await screen.findByRole("button", { name: /Repasar/ });
    await waitFor(() => expect((review as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(review);
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar respuesta" }));
    fireEvent.click(await screen.findByRole("button", { name: /Bien/ }));

    expect(await screen.findByText("Buen trabajo")).toBeTruthy();
    const raw = window.localStorage.getItem("aula-kanban-tarjetas:p1");
    expect(raw).toContain("c1");

    unmount();
    render(<TarjetasApp projectId="p1" role="owner" />);
    const again = await screen.findByRole("button", { name: /Repasar/ });
    expect((again as HTMLButtonElement).disabled).toBe(true);
  });

  it("deja la app en solo lectura para invitados", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ state: null, updatedAt: null })));
    render(<TarjetasApp projectId="p1" role="guest" />);
    expect(await screen.findByText("Solo lectura")).toBeTruthy();
    expect((screen.getByLabelText("Nombre del mazo") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Crear mazo" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
