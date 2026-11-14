import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type KanbanView from "../tasks/kanban-view";
import type { Task } from "../../../lib/domain/task";
import ClassView from "./class-view";

const task: Task = {
  id: "t1",
  title: "Maqueta del proyecto",
  description: "",
  imageUrl: "",
  assignee: "",
  assignees: [],
  dueDate: "2026-11-20",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 1,
};

const kanban: ComponentProps<typeof KanbanView> = {
  tasks: [task],
  visible: [task],
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
  total: 1,
  progress: 0,
};

describe("ClassView con el calendario real", () => {
  it("carga la sección Calendario y abre la tarea con el editor existente", async () => {
    const onOpenEditor = vi.fn();
    const onSection = vi.fn();
    render(<ClassView section="calendario" onSection={onSection} kanban={{ ...kanban, onOpenEditor }} />);

    expect(await screen.findByRole("heading", { name: "Calendario" }, { timeout: 15000 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tablero de tareas" })).toBeNull();

    const nav = screen.getByRole("navigation", { name: "Secciones de clase" });
    expect(within(nav).getByRole("button", { name: "Calendario" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByText("Maqueta del proyecto"));
    expect(onOpenEditor).toHaveBeenCalledWith("pending", task);

    fireEvent.click(within(nav).getByRole("button", { name: "Tareas" }));
    expect(onSection).toHaveBeenCalledWith("tareas");
  }, 20000);
});
