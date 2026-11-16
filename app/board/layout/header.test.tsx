import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../shared/model";
import BoardHeader from "./header";

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
  activeProject: project,
  projects: [project],
  projectId: "p1",
  view: "clase" as const,
  onView: vi.fn(),
  owner: false,
  admin: false,
  canManage: true,
  onNewProject: vi.fn(),
  onShareProject: vi.fn(),
  onMembers: vi.fn(),
  onDeleteProject: vi.fn(),
  onSettings: vi.fn(),
};

describe("BoardHeader", () => {
  it("mantiene Administración y Clase en la cabecera", () => {
    render(<BoardHeader {...props} />);

    const nav = screen.getByRole("navigation", { name: "Vistas" });
    expect(within(nav).getAllByRole("button")).toHaveLength(2);
    expect(within(nav).getByRole("button", { name: "Administración" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Clase" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).queryByRole("button", { name: "Alumnos" })).toBeNull();
    expect(within(nav).queryByRole("button", { name: "Profesores" })).toBeNull();
    expect(within(nav).queryByRole("button", { name: "Tienda" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tienda" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Documentación" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ajustes" })).toBeTruthy();
    expect(screen.queryByText("Ajustes de la cuenta")).toBeNull();
  });

  it("conserva vista y sección en los enlaces de proyecto", () => {
    const { rerender } = render(<BoardHeader {...props} view="administracion" />);
    expect(screen.getByRole("link", { name: /Pruebas/ }).getAttribute("href")).toBe("/?project=p1&view=administracion");

    rerender(<BoardHeader {...props} view="administracion" administracionSection="profesores" />);
    expect(screen.getByRole("link", { name: /Pruebas/ }).getAttribute("href")).toBe("/?project=p1&view=administracion&section=profesores");

    rerender(<BoardHeader {...props} view="administracion" administracionSection="tienda" />);
    expect(screen.getByRole("link", { name: /Pruebas/ }).getAttribute("href")).toBe("/?project=p1&view=administracion&section=tienda");

    rerender(<BoardHeader {...props} view="ajustes" settingsSection="administradores" />);
    expect(screen.getByRole("link", { name: /Pruebas/ }).getAttribute("href")).toBe("/?project=p1&view=ajustes&section=administradores");
  });

  it("estructura la cabecera en marca, navegación central y acciones", () => {
    const { container } = render(<BoardHeader {...props} />);

    const inner = container.querySelector(".topbar-inner");
    const brand = container.querySelector(".topbar-brand");
    const nav = container.querySelector(".topbar-nav");
    const actions = container.querySelector(".topbar-actions");
    expect(inner?.firstElementChild).toBe(brand);
    expect(brand?.querySelector(".wordmark")).toBeTruthy();
    expect(nav?.querySelector("nav.main-nav")).toBeTruthy();
    expect(nav?.querySelector(".class-action")).toBeTruthy();
    expect(actions?.querySelector(".project-menu")).toBeTruthy();
    expect(actions?.querySelector(".header-settings")).toBeTruthy();
    expect(actions?.querySelector(".account-menu")).toBeTruthy();
    expect(actions?.querySelector(".remix-action")).toBeNull();
  });

  it("oculta la navegación cuando no hay proyecto", () => {
    const { container } = render(<BoardHeader {...props} activeProject={undefined} projects={[]} />);
    expect(container.querySelector("nav.main-nav")).toBeNull();
    expect(container.querySelector(".topbar-brand .wordmark")).toBeTruthy();
    expect(container.querySelector(".topbar-actions .account-menu")).toBeTruthy();
  });

  it("abre Clase, Administración y Ajustes y marca sus acciones como activas", () => {
    const onView = vi.fn();
    const onSettings = vi.fn();
    const { rerender } = render(<BoardHeader {...props} onView={onView} onSettings={onSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Clase" }));
    expect(onView).toHaveBeenCalledWith("clase");

    fireEvent.click(screen.getByRole("button", { name: "Administración" }));
    expect(onView).toHaveBeenCalledWith("administracion");

    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }));
    expect(onSettings).toHaveBeenCalled();

    rerender(<BoardHeader {...props} view="administracion" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Administración" }).getAttribute("aria-current")).toBe("page");

    rerender(<BoardHeader {...props} view="clase" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Clase" }).getAttribute("aria-current")).toBe("page");

    rerender(<BoardHeader {...props} view="ajustes" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Ajustes" }).getAttribute("aria-current")).toBe("page");
  });
});
