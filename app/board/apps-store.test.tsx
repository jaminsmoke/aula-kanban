import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppsStore, { type StoreApp } from "./apps-store";

vi.mock("./store-lottie", () => ({
  default: function MockStoreLottie() {
    return <div data-testid="lottie-check" />;
  },
}));

const apps: StoreApp[] = [
  { id: "nodum", status: "installed", url: "https://notas.example.test", version: "1.2.3" },
  { id: "affine", status: "not_installed", url: null, version: null },
  { id: "excalidraw", status: "not_installed", url: null, version: null },
];

const noop = () => {};
const baseProps = { configured: true, apps, error: "", onManage: vi.fn(), onOpen: noop, onRefresh: noop, onShowGuide: noop, onClose: noop };

describe("Tienda de aplicaciones VPS", () => {
  it("muestra el check Lottie al pasar una app a instalada", async () => {
    const before: StoreApp[] = [{ id: "nodum", status: "not_installed", url: null, version: null }];
    const after: StoreApp[] = [{ id: "nodum", status: "installed", url: "https://notas.example.test", version: "1.2.3" }];
    const { rerender } = render(<AppsStore configured apps={before} error="" role="owner" onManage={noop} onOpen={noop} onRefresh={noop} onShowGuide={noop} onClose={noop} />);
    expect(screen.queryByTestId("lottie-check")).toBeNull();
    rerender(<AppsStore configured apps={after} error="" role="owner" onManage={noop} onOpen={noop} onRefresh={noop} onShowGuide={noop} onClose={noop} />);
    await waitFor(() => expect(screen.getByTestId("lottie-check")).toBeTruthy());
  });
  it("muestra estado y versión de cada aplicación del catálogo", () => {
    render(<AppsStore {...baseProps} role="owner" />);
    expect(screen.getByText("Instalada")).toBeTruthy();
    expect(screen.getByText("v1.2.3")).toBeTruthy();
    expect(screen.getAllByText("No instalada")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Instalar/ })).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Aplicaciones VPS" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Aplicaciones nativas" })).toBeTruthy();
  });

  it("para el alumnado solo permite abrir, no gestionar", () => {
    render(<AppsStore {...baseProps} role="student" />);
    expect(screen.getByRole("button", { name: /Abrir/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Instalar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Desinstalar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Resetear/ })).toBeNull();
  });

  it("resetear pide confirmación y avisa de que borra los datos", () => {
    const onManage = vi.fn();
    render(<AppsStore {...baseProps} role="owner" onManage={onManage} />);
    fireEvent.click(screen.getByRole("button", { name: /Resetear/ }));
    expect(screen.getByText(/eliminarán sus volúmenes y datos/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sí, borrar datos/ }));
    expect(onManage).toHaveBeenCalledWith("nodum", "reset");
  });

  it("la sección nativa instala y desinstala Excalidraw solo para owner/admin", () => {
    const onManage = vi.fn();
    const nativeApps: StoreApp[] = [{ id: "excalidraw", status: "installed", url: null, version: null }];
    const { rerender } = render(<AppsStore {...baseProps} role="owner" apps={nativeApps} onManage={onManage} />);
    fireEvent.click(screen.getByRole("button", { name: /Desinstalar/ }));
    expect(onManage).toHaveBeenCalledWith("excalidraw", "uninstall");
    expect(screen.getByText(/Excalidraw sigue alimentando la pizarra de las tareas/)).toBeTruthy();
    rerender(<AppsStore {...baseProps} role="student" apps={nativeApps} onManage={onManage} />);
    expect(screen.queryByRole("button", { name: /Desinstalar/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Abrir/ })).toBeTruthy();
  });

  it("sin gestor conectado ofrece la guía de configuración al propietario", () => {
    const onShowGuide = vi.fn();
    render(<AppsStore {...baseProps} role="owner" configured={false} onShowGuide={onShowGuide} />);
    expect(screen.getByText(/El gestor del VPS no está conectado todavía/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Cómo configurar el VPS/ }));
    expect(onShowGuide).toHaveBeenCalled();
  });

  it("el buscador filtra por nombre y descripción", async () => {
    render(<AppsStore {...baseProps} role="owner" />);
    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "pizarra" } });
    expect(screen.getByText("Excalidraw")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Nodum")).toBeNull());
    fireEvent.change(screen.getByLabelText("Buscar aplicaciones"), { target: { value: "sin-coincidencias" } });
    expect(screen.getAllByText(/Sin resultados para/)).toHaveLength(2);
  });

  it("los chips filtran por categoría y por instaladas", async () => {
    render(<AppsStore {...baseProps} role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: /Nativas/ }));
    expect(screen.getByText("Excalidraw")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Nodum")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Instaladas/ }));
    expect(screen.getByText("Nodum")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("AFFiNE")).toBeNull();
      expect(screen.queryByText("Excalidraw")).toBeNull();
    });
  });

  it("no ofrece instalar aplicaciones ausentes del catálogo del gestor", () => {
    render(<AppsStore {...baseProps} role="owner" apps={[{ id: "affine", status: "not_installed", url: null }]} />);
    expect(screen.getAllByText("No disponible en este gestor")).toHaveLength(2);
    expect(screen.getAllByText("No instalada")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Instalar/ })).toHaveLength(2);
  });
});
