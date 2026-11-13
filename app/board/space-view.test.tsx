import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpaceView from "./space-view";
import { jsonResponse } from "../../vitest.setup";

describe("Mi espacio", () => {
  it("muestra Excalidraw instalada y abre la tienda sin referencias al VPS", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "installed", url: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect(await screen.findByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Aula Store/ }));
    expect(await screen.findByRole("region", { name: "Aula Store" })).toBeTruthy();
    expect(screen.queryByText(/VPS/)).toBeNull();
  });
  it("oculta las herramientas no instaladas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ apps: [{ id: "excalidraw", status: "not_installed", url: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    await screen.findByText(/Todavía no hay herramientas en Mi espacio/);
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
  });
});
