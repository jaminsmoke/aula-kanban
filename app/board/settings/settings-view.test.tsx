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
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
});

describe("SettingsView", () => {
  it("muestra Cuenta y permite abrir Administradores", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => Promise.resolve(String(input).includes("/api/storage/status")
      ? jsonResponse({ database: true, bucket: true, bucketReachable: true, uploads: 2, ok: true })
      : jsonResponse([]))));

    render(<SettingsView {...props} />);

    expect(screen.getByRole("navigation", { name: "Secciones de ajustes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cuenta" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("seedy@sites.test")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Administradores" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Administradores" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Administradores" }).getAttribute("aria-current")).toBe("page");
  });

  it("oculta Administradores a quien no es propietario ni administrador", () => {
    render(<SettingsView {...props} owner={false} admin={false} />);

    expect(screen.queryByRole("button", { name: "Administradores" })).toBeNull();
    expect(screen.getByRole("button", { name: "Apariencia" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cuenta" }).getAttribute("aria-current")).toBe("page");
  });

  it("abre Apariencia y permite cambiar el tema", () => {
    render(<SettingsView {...props} owner={false} admin={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Apariencia" }));
    expect(screen.getByRole("heading", { name: "Apariencia" })).toBeTruthy();
    const group = screen.getByRole("group", { name: "Tema de la interfaz" });
    expect(within(group).getByRole("button", { name: "Sistema" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(group).getByRole("button", { name: "Oscuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(within(group).getByRole("button", { name: "Oscuro" }).getAttribute("aria-pressed")).toBe("true");
  });
});
