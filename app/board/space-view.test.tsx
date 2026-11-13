import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpaceView from "./space-view";
import { jsonResponse } from "../../vitest.setup";

describe("Mi espacio sin VPS", () => {
  it("mantiene las herramientas nativas si el gestor no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, connectionError: true, apps: [{ id: "excalidraw", status: "installed", url: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect(await screen.findByRole("button", { name: /Excalidraw/ })).toBeTruthy();
    expect(screen.getByText(/La conexión segura con las aplicaciones del VPS no está disponible/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /AFFiNE/ })).toBeNull();
  });
  it("ofrece al propietario una guía que no solicita instalar aplicaciones ni revelar secretos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Cómo configurar el VPS" }));
    expect(screen.getByRole("dialog", { name: "Conectar un VPS" })).toBeTruthy();
    expect(screen.getByText(/La configuración inicial no instala aplicaciones del catálogo/)).toBeTruthy();
    expect(screen.getByText(/No pegues contraseñas ni tokens en el chat/)).toBeTruthy();
  });

  it("oculta los iconos de apps VPS no instaladas y abre la tienda desde el dock", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: true, apps: [{ id: "nodum", status: "not_installed", url: null, version: null }, { id: "affine", status: "not_installed", url: null, version: null }, { id: "excalidraw", status: "installed", url: null, version: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    await screen.findByRole("button", { name: /Excalidraw/ });
    expect(screen.queryByRole("button", { name: /Nodum/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /AFFiNE/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Aula Store/ }));
    const store = await screen.findByRole("region", { name: "Aula Store" });
    expect(store).toBeTruthy();
    expect(screen.getAllByText("No instalada")).toHaveLength(2);
  });

  it("oculta el icono de Excalidraw hasta que se instala y lo muestra al instalarse", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [{ id: "excalidraw", status: "not_installed", url: null, version: null }] })));
    const view = render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    await screen.findByText(/Todavía no hay herramientas en Mi espacio/);
    expect(screen.queryByRole("button", { name: /Excalidraw/ })).toBeNull();
    view.unmount();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [{ id: "excalidraw", status: "installed", url: null, version: null }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect(await screen.findByRole("button", { name: /Excalidraw/ })).toBeTruthy();
  });

  it("muestra el icono de una app VPS solo cuando está instalada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: true, apps: [{ id: "nodum", status: "installed", url: "https://notas.example.test", version: "1.2.3" }] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    expect(await screen.findByRole("button", { name: /Nodum/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /AFFiNE/ })).toBeNull();
  });

  it("no muestra la opción de configuración a un alumno", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [] })));
    render(<SpaceView role="student" projectId="default" onExit={() => {}} />);
    await screen.findByText(/el Space está incompleto/);
    expect(screen.queryByRole("button", { name: "Cómo configurar el VPS" })).toBeNull();
  });
});
