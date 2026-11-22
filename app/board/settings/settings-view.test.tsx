import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import type { Project } from "../shared/model";
import SettingsView from "./settings-view";

const project: Project = {
  id: "p1",
  name: "Pruebas",
  createdAt: 1,
  role: "teacher",
  studentSection: null,
  teacherId: "t1",
};

const props = {
  user: { displayName: "Seedy", email: "seedy@sites.test" },
  projectsLoaded: true,
  owner: true,
  admin: false,
  activeProject: project,
  onProjectsChanged: vi.fn(),
  onRemix: vi.fn(),
};

/**
 * Prepara las respuestas de las secciones y registra qué endpoints se piden.
 * @returns Las URLs solicitadas por la vista.
 */
function mockRequests() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/api/storage/status")) {
      return jsonResponse({ database: true, bucket: true, bucketReachable: true, uploads: 2, ok: true });
    }
    if (url.includes("/api/mcp/tokens") || url.includes("/api/administrators")) return jsonResponse([]);
    return jsonResponse([]);
  }));
  return calls;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
  window.history.replaceState({}, "", "/");
});

describe("SettingsView", () => {
  it("muestra las siete secciones y separa Tokens de Cuenta", async () => {
    const calls = mockRequests();

    render(<SettingsView {...props} />);

    const navigation = screen.getByRole("navigation", { name: "Secciones de ajustes" });
    for (const name of ["Cuenta", "Apariencia", "Documentación", "Tokens MCP", "Administradores", "Permisos", "Almacenamiento"]) {
      expect(within(navigation).getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Cuenta" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("seedy@sites.test")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tokens del MCP" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Tokens MCP" }));
    expect(screen.getByRole("heading", { name: "Tokens del MCP" })).toBeTruthy();
    await waitFor(() => expect(calls.some((url) => url.includes("/api/mcp/tokens"))).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Administradores" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Administradores" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Administradores" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Permisos" }));
    expect(screen.getByRole("heading", { name: "Permisos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Permisos" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { name: "Instalar y desinstalar apps" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Almacenamiento" }));
    await waitFor(() => expect(screen.getByText("Disponible")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Almacenamiento de archivos" })).toBeTruthy();
  });

  it("oculta Administradores y Almacenamiento a quien no es propietario ni administrador", () => {
    mockRequests();
    render(<SettingsView {...props} owner={false} admin={false} />);

    expect(screen.queryByRole("button", { name: "Administradores" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Permisos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Almacenamiento" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tokens MCP" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cuenta" }).getAttribute("aria-current")).toBe("page");
  });

  it("abre la documentación sin el botón de vuelta al tablero", async () => {
    mockRequests();
    render(<SettingsView {...props} section="documentacion" />);

    expect(screen.getByRole("button", { name: "Documentación" }).getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("heading", { level: 1, name: "Documentación de Aula Kanban" }, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Volver a Clase/ })).toBeNull();
  });

  it("conserva los enlaces directos a las tres secciones restringidas con acceso", async () => {
    const sections = [
      { id: "administradores", label: "Administradores", heading: "Administradores" },
      { id: "permisos", label: "Permisos", heading: "Permisos" },
      { id: "almacenamiento", label: "Almacenamiento", heading: "Almacenamiento de archivos" },
    ] as const;

    for (const item of sections) {
      mockRequests();
      window.history.replaceState({}, "", `/?project=p1&view=ajustes&section=${item.id}`);
      const view = render(<SettingsView {...props} section={item.id} />);

      expect(await screen.findByRole("heading", { name: item.heading })).toBeTruthy();
      expect(screen.getByRole("button", { name: item.label }).getAttribute("aria-current")).toBe("page");
      expect(window.location.search).toBe(`?project=p1&view=ajustes&section=${item.id}`);
      view.unmount();
    }
  });

  it("conserva Almacenamiento al recargar con permiso de administración", async () => {
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=almacenamiento");
    render(<SettingsView {...props} owner={false} admin section="almacenamiento" />);

    expect(await screen.findByRole("heading", { name: "Almacenamiento de archivos" })).toBeTruthy();
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=almacenamiento");
  });

  it("redirige Administradores sin acceso", async () => {
    const onSection = vi.fn();
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=administradores");

    render(<SettingsView {...props} owner={false} admin={false} section="administradores" onSection={onSection} />);

    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeTruthy();
    await waitFor(() => expect(onSection).toHaveBeenCalledWith("cuenta"));
    expect(window.location.search).toBe("?project=p1&view=ajustes");
  });

  it("conserva la sección y espera la comprobación antes de redirigir", async () => {
    const onSection = vi.fn();
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=almacenamiento");

    const view = render(<SettingsView {...props} projectsLoaded={false} owner={false} admin={false} section="almacenamiento" onSection={onSection} />);

    expect(screen.getByRole("status").textContent).toContain("Comprobando permisos…");
    expect(screen.queryByRole("heading", { name: "Almacenamiento de archivos" })).toBeNull();
    expect(onSection).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=almacenamiento");

    view.rerender(<SettingsView {...props} projectsLoaded owner={false} admin={false} section="almacenamiento" onSection={onSection} />);
    await waitFor(() => expect(onSection).toHaveBeenCalledWith("cuenta"));
    expect(window.location.search).toBe("?project=p1&view=ajustes");
  });

  it("mantiene una sección restringida al terminar la comprobación con acceso", async () => {
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=almacenamiento");
    const onSection = vi.fn();

    const view = render(<SettingsView {...props} projectsLoaded={false} owner admin={false} section="almacenamiento" onSection={onSection} />);
    expect(screen.getByRole("status").textContent).toContain("Comprobando permisos…");

    view.rerender(<SettingsView {...props} projectsLoaded owner admin={false} section="almacenamiento" onSection={onSection} />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Almacenamiento de archivos" })).toBeTruthy());
    expect(onSection).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=almacenamiento");
  });

  it("vuelve a Cuenta si una sección restringida se abre sin permiso", async () => {
    const onSection = vi.fn();
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=almacenamiento&from=correo");

    render(<SettingsView {...props} owner={false} admin={false} section="almacenamiento" onSection={onSection} />);

    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeTruthy();
    await waitFor(() => expect(onSection).toHaveBeenCalledWith("cuenta"));
    expect(window.location.search).toBe("?project=p1&view=ajustes&from=correo");
  });

  it("vuelve a Cuenta si Permisos se abre sin permiso", async () => {
    const onSection = vi.fn();
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=permisos");

    render(<SettingsView {...props} owner={false} admin={false} section="permisos" onSection={onSection} />);

    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeTruthy();
    await waitFor(() => expect(onSection).toHaveBeenCalledWith("cuenta"));
    expect(window.location.search).toBe("?project=p1&view=ajustes");
  });

  it("abre Apariencia y permite cambiar el tema", () => {
    mockRequests();
    render(<SettingsView {...props} owner={false} admin={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Apariencia" }));
    expect(screen.getByRole("heading", { name: "Apariencia" })).toBeTruthy();
    const group = screen.getByRole("group", { name: "Tema de la interfaz" });
    expect(within(group).getByRole("button", { name: "Sistema" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(group).getByRole("button", { name: "Oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(within(group).getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("oculta Tokens MCP a la demo y vuelve a Cuenta", async () => {
    const onSection = vi.fn();
    mockRequests();
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=tokens");

    render(<SettingsView {...props} owner={false} admin={false} guest section="tokens" onSection={onSection} />);

    expect(screen.queryByRole("button", { name: "Tokens MCP" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeTruthy();
    await waitFor(() => expect(onSection).toHaveBeenCalledWith("cuenta"));
    expect(window.location.search).toBe("?project=p1&view=ajustes");
  });

  it("abre Tu Site y lanza el remix", () => {
    const onRemix = vi.fn();
    mockRequests();
    render(<SettingsView {...props} owner={false} admin={false} onRemix={onRemix} />);

    fireEvent.click(screen.getByRole("button", { name: "Tu Site" }));
    expect(screen.getByRole("heading", { name: "Tu Site" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Haz tu Site de Aula Kanban/ }));
    expect(onRemix).toHaveBeenCalledTimes(1);
  });
});
