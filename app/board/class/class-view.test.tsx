import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type KanbanView from "../tasks/kanban-view";
import ClassView from "./class-view";

const kanban: ComponentProps<typeof KanbanView> = {
  tasks: [],
  visible: [],
  students: [],
  search: "",
  filter: "",
  studentFilter: "",
  onSearch: vi.fn(),
  onFilter: vi.fn(),
  onStudentFilter: vi.fn(),
  loadError: "",
  onRetry: vi.fn(),
  saving: false,
  isGuest: false,
  filtered: false,
  dragged: null,
  destination: null,
  canEditTask: () => true,
  canGrabTask: () => true,
  onOpenEditor: vi.fn(),
  onDragStart: vi.fn(),
  onDragOver: vi.fn(),
  onDragEnd: vi.fn(),
  onDragCancel: vi.fn(),
  finished: 0,
  total: 0,
  progress: 0,
};

const mochilaProps = { role: "student" as const, projectId: "p1" };

describe("ClassView", () => {
  it("muestra Tareas como sección activa y el tablero actual", () => {
    render(<ClassView section="tareas" onSection={vi.fn()} kanban={kanban} {...mochilaProps} />);

    expect(screen.getByRole("navigation", { name: "Secciones de clase" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tareas" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { name: "Tablero de tareas" })).toBeTruthy();
  });

  it("notifica el cambio de sección", () => {
    const onSection = vi.fn();
    render(<ClassView section="tareas" onSection={onSection} kanban={kanban} {...mochilaProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Tareas" }));
    expect(onSection).toHaveBeenCalledWith("tareas");
  });

  it("etiqueta la sección personal según el rol", () => {
    render(<ClassView section="tareas" onSection={vi.fn()} kanban={kanban} {...mochilaProps} />);
    expect(screen.getByRole("button", { name: "Mi mochila" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Maletín" })).toBeNull();
  });
});
