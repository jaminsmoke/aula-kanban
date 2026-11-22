import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "../../../../lib/domain/task";
import Modal from "../../shared/modal";
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
const today = new Date();
const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const todayTask: Task = { ...base, id: "t3", title: "Tarea de hoy", dueDate: todayValue };
const withoutDate: Task = { ...base, id: "t2", title: "Tarea sin fecha", dueDate: "" };

const props = { loadError: "", onRetry: vi.fn(), onOpenTask: vi.fn() };

function FocusHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CalendarView {...props} onOpenTask={() => setOpen(true)} tasks={[withDate]} />
      {open ? (
        <Modal title="Tarea" onClose={() => setOpen(false)}>
          <button type="button" onClick={() => setOpen(false)}>Cerrar ficha</button>
        </Modal>
      ) : null}
    </>
  );
}

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

    expect(onOpenTask).toHaveBeenCalledTimes(1);
    expect(onOpenTask).toHaveBeenCalledWith(withDate);
  });

  it("expone un control enfocable y abre con Enter o Espacio", () => {
    const onOpenTask = vi.fn();
    render(<CalendarView {...props} onOpenTask={onOpenTask} tasks={[withDate]} />);

    const eventButton = screen.getByRole("button", { name: /Abrir tarea: Maqueta del proyecto/ });
    expect(eventButton.getAttribute("aria-label")).toContain("Estado: Por hacer");
    eventButton.focus();
    expect(document.activeElement).toBe(eventButton);

    fireEvent.keyDown(eventButton, { key: "Enter" });
    expect(onOpenTask).toHaveBeenNthCalledWith(1, withDate);
    fireEvent.keyDown(eventButton, { key: " " });
    expect(onOpenTask).toHaveBeenCalledTimes(2);
  });

  it("devuelve el foco al evento al cerrar la ficha", () => {
    render(<FocusHarness />);

    const eventButton = screen.getByRole("button", { name: /Abrir tarea: Maqueta del proyecto/ });
    eventButton.focus();
    fireEvent.keyDown(eventButton, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ficha" }));

    expect(document.activeElement).toBe(eventButton);
  });

  it("mantiene el control enfocable en Mes, Semana y Agenda", async () => {
    render(<CalendarView {...props} tasks={[todayTask]} />);

    expect(screen.getByRole("button", { name: /Abrir tarea: Tarea de hoy/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(await screen.findByRole("button", { name: /Abrir tarea: Tarea de hoy/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Agenda" }));
    expect(await screen.findByRole("button", { name: /Abrir tarea: Tarea de hoy/ })).toBeTruthy();
  });

  it("muestra la carga y el error de tareas", () => {
    const { rerender } = render(<CalendarView {...props} tasks={null} />);
    expect(screen.getByRole("status").textContent).toContain("Cargando el calendario");

    rerender(<CalendarView {...props} tasks={null} loadError="Sin conexión" />);
    expect(screen.getByRole("status").textContent).toContain("No se pudieron cargar las tareas");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
