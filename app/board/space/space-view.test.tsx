import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpaceView from "./space-view";
import { jsonResponse } from "../../../vitest.setup";

describe("Tienda", () => {
  it("muestra Excalidraw instalada y abre la tienda sin referencias al VPS", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "installed", url: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect(await screen.findByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Aula Store/ }));
    expect(await screen.findByRole("region", { name: "Aula Store" })).toBeTruthy();
    expect(screen.queryByText(/VPS/)).toBeNull();
  });
  it("vuelve a Clase desde el dock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "installed", url: null }] })));
    const onExit = vi.fn();
    render(<SpaceView role="owner" projectId="default" onExit={onExit} />);
    expect(await screen.findByRole("region", { name: "Tienda" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clase" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("oculta las herramientas no instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "not_installed", url: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    await screen.findByText(/Todavía no hay herramientas instaladas/);
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
  });

  it("muestra un error de conexión sin afirmar que no hay aplicaciones instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin conexión")));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("No se pudieron consultar las aplicaciones");
    expect(screen.queryByText(/Todavía no hay herramientas instaladas/)).toBeNull();
  });
});
