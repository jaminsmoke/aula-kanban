import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppsStore, { type StoreApp } from "./apps-store";

const noop = () => {};
const native: StoreApp[] = [{ id: "excalidraw", status: "installed", url: null }];
const props = { apps: native, error: "", onManage: vi.fn(), onOpen: noop, onRefresh: noop, onClose: noop };

describe("Aula Store", () => {
  it("permite al administrador desinstalar Excalidraw", () => {
    const manage = vi.fn();
    render(<AppsStore {...props} role="owner" onManage={manage} />);
    fireEvent.click(screen.getByRole("button", { name: /Desinstalar/ }));
    expect(manage).toHaveBeenCalledWith("excalidraw", "uninstall");
    expect(screen.queryByText(/VPS/)).toBeNull();
  });
  it("permite al alumnado abrir sin gestionar", () => {
    render(<AppsStore {...props} role="student" />);
    expect(screen.getByRole("button", { name: /Abrir/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Desinstalar/ })).toBeNull();
  });
  it("busca por descripción y filtra instaladas", () => {
    render(<AppsStore {...props} role="owner" />);
    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "pizarra" } });
    expect(screen.getByText("Excalidraw")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Instaladas/ }));
    expect(screen.getByText("Excalidraw")).toBeTruthy();
  });
});
