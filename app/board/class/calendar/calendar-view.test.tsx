import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "../../../../lib/domain/task";
import CalendarView from "./calendar-view";

const base: Omit<Task, "id" | "title" | "dueDate"> = {
  description: "",
  imageUrl: "",
  assignee: "",
  assignees: [],
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 1,
};

const withDate: Task = { ...base, id: "t1", title: "Maqueta del proyecto", dueDate: "2026-11-20" };
const withoutDate: Task = { ...base, id: "t2", title: "Tarea sin fecha", dueDate: "" };

const props = { loadError: "", onRetry: vi.fn(), onOpenTask: vi.fn() };

describe("CalendarView", () => {
  it("muestra las tareas con fecha y no inventa fecha para las demás", () => {
    render(<CalendarView {...props} tasks={[withDate, withoutDate]} />);

    expect(screen.getByRole("heading", { name: "Calendario" })).toBeTruthy();
    expect(screen.getByText("Maqueta del proyecto")).toBeTruthy();
    expect(screen.queryByText("Tarea sin fecha")).toBeNull();
    expect(screen.queryByText(/Todavía no hay tareas con fecha/)).toBeNull();
  });

  it("explica el estado vacío cuando ninguna tarea tiene fecha", () => {
    render(<CalendarView {...props} tasks={[withoutDate]} />);

    expect(screen.getByText(/Todavía no hay tareas con fecha/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Calendario" })).toBeTruthy();
  });

  it("marca la región y el estado de cada evento para los estilos y el foco", () => {
    const { container } = render(<CalendarView {...props} tasks={[withDate]} />);

    expect(screen.getByRole("region", { name: "Calendario de tareas" })).toBeTruthy();
    expect(container.querySelector(".rbc-event.status-pending")).toBeTruthy();
    expect(container.querySelector(".rbc-toolbar")).toBeTruthy();
  });

  it("abre la tarea al pulsar su entrada", () => {
    const onOpenTask = vi.fn();
    render(<CalendarView {...props} onOpenTask={onOpenTask} tasks={[withDate]} />);

    fireEvent.click(screen.getByText("Maqueta del proyecto"));

    expect(onOpenTask).toHaveBeenCalledWith(withDate);
  });

  it("muestra la carga y el error de tareas", () => {
    const { rerender } = render(<CalendarView {...props} tasks={null} />);
    expect(screen.getByRole("status").textContent).toContain("Cargando el calendario");

    rerender(<CalendarView {...props} tasks={null} loadError="Sin conexión" />);
    expect(screen.getByRole("status").textContent).toContain("No se pudieron cargar las tareas");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
