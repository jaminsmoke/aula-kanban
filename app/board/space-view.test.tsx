import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpaceView from "./space-view";
import { jsonResponse } from "../../vitest.setup";

describe("Mi espacio sin VPS", () => {
  it("ofrece al propietario una guía que no solicita instalar aplicaciones ni revelar secretos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [] })));
    render(<SpaceView role="owner" projectId="default" onExit={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Cómo configurar el VPS" }));
    expect(screen.getByRole("dialog", { name: "Conectar un VPS" })).toBeTruthy();
    expect(screen.getByText(/La configuración inicial no instala aplicaciones del catálogo/)).toBeTruthy();
    expect(screen.getByText(/No pegues contraseñas ni tokens en el chat/)).toBeTruthy();
  });

  it("no muestra la opción de configuración a un alumno", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ configured: false, apps: [] })));
    render(<SpaceView role="student" projectId="default" onExit={() => {}} />);
    await screen.findByText(/Las aplicaciones del VPS son opcionales/);
    expect(screen.queryByRole("button", { name: "Cómo configurar el VPS" })).toBeNull();
  });
});
