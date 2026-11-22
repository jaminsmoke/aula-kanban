import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StoreDesktop from "./store-desktop";
import { jsonResponse } from "../../../vitest.setup";

describe("Tienda", () => {
  it("muestra Excalidraw instalada y abre la tienda sin referencias al VPS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "installed", url: null }] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<StoreDesktop role="owner" projectId="default" />);
    expect(await screen.findByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/space-apps?project=default", { cache: "no-store" });
    fireEvent.click(screen.getByRole("button", { name: /Aula Store/ }));
    expect(await screen.findByRole("region", { name: "Aula Store" })).toBeTruthy();
    expect(screen.queryByText(/VPS/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Clase" })).toBeNull();
  });

  it("oculta las herramientas no instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "not_installed", url: null }] })));
    render(<StoreDesktop role="owner" projectId="default" />);
    await screen.findByText(/Todavía no hay herramientas instaladas/);
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
  });

  it("muestra un error de conexión sin afirmar que no hay aplicaciones instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin conexión")));
    render(<StoreDesktop role="owner" projectId="default" />);
    expect((await screen.findByRole("alert")).textContent).toContain("No se pudieron consultar las aplicaciones");
    expect(screen.queryByText(/Todavía no hay herramientas instaladas/)).toBeNull();
  });

  it("devuelve App Close para Aula Documentos y no para otros paneles", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "aula-documentos", status: "installed", url: null }] }));
    vi.stubGlobal("fetch", fetchMock);
    const onAppClose = vi.fn();
    const { unmount } = render(<StoreDesktop role="owner" projectId="default" onAppClose={onAppClose} />);
    fireEvent.click(await screen.findByRole("button", { name: /Aula Documentos/ }));
    await screen.findByRole("dialog", { name: "Aula Documentos" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Aula Documentos" }));
    expect(onAppClose).toHaveBeenCalledWith("aula-documentos");
    unmount();
    onAppClose.mockClear();
    const second = render(<StoreDesktop role="owner" projectId="default" onAppClose={onAppClose} />);
    fireEvent.click(await screen.findByRole("button", { name: /Aula Documentos/ }));
    await screen.findByRole("dialog", { name: "Aula Documentos" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Aula Documentos" }));
    expect(onAppClose).toHaveBeenCalledWith("aula-documentos");
    second.unmount();
  });
});
