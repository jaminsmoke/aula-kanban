import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../vitest.setup";
import TarjetasApp from "./tarjetas-app";

describe("Tarjetas de repaso", () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it("deja la app en solo lectura para invitados", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ state: null, updatedAt: null })));
    render(<TarjetasApp projectId="p1" role="guest" />);
    expect(await screen.findByText("Solo lectura")).toBeTruthy();
    expect((screen.getByLabelText("Nombre del mazo") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Crear mazo" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
