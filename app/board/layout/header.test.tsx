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
  onRemix: vi.fn(),
  onSettings: vi.fn(),
};

describe("BoardHeader", () => {
  it("separa las vistas de trabajo de la documentación", () => {
    render(<BoardHeader {...props} />);

    const nav = screen.getByRole("navigation", { name: "Vistas" });
    for (const name of ["Clase", "Alumnos", "Profesores", "Mi espacio"]) {
      expect(within(nav).getByRole("button", { name })).toBeTruthy();
    }
    expect(within(nav).queryByRole("button", { name: "Documentación" })).toBeNull();
    expect(within(nav).queryByText("Mi espacio")).toBeNull();
    expect(screen.getByRole("button", { name: "Documentación" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajustes" })).toBeTruthy();
    expect(screen.queryByText("Ajustes de la cuenta")).toBeNull();
    expect(within(nav).getByRole("button", { name: "Clase" }).getAttribute("aria-current")).toBe("page");
  });

  it("abre Mi espacio, Documentación y Ajustes y marca sus acciones como activas", () => {
    const onView = vi.fn();
    const onSettings = vi.fn();
    const { rerender } = render(<BoardHeader {...props} onView={onView} onSettings={onSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Mi espacio" }));
    expect(onView).toHaveBeenCalledWith("espacio");

    fireEvent.click(screen.getByRole("button", { name: "Documentación" }));
    expect(onView).toHaveBeenCalledWith("documentacion");

    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }));
    expect(onSettings).toHaveBeenCalled();

    rerender(<BoardHeader {...props} view="espacio" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Mi espacio" }).getAttribute("aria-current")).toBe("page");

    rerender(<BoardHeader {...props} view="documentacion" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Documentación" }).getAttribute("aria-current")).toBe("page");

    rerender(<BoardHeader {...props} view="ajustes" onView={onView} onSettings={onSettings} />);
    expect(screen.getByRole("button", { name: "Ajustes" }).getAttribute("aria-current")).toBe("page");
  });
});
