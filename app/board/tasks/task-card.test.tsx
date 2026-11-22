import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskCard from "./task-card";
import type { Task } from "../../../lib/domain/task";

const task: Task = {
  id: "t1",
  title: "Investigar placas",
  description: "Buscar sensores compatibles",
  assignee: "Ada",
  assignees: [],
  imageUrl: "",
  dueDate: "2026-11-30",
  priority: "high",
  status: "pending",
  createdAt: 1,
  revision: 0,
};

function renderCard(overrides: Partial<Task> = {}, props: Partial<Parameters<typeof TaskCard>[0]> = {}) {
  const handlers = {
    onEdit: vi.fn(),
  };
  const view = render(<TaskCard task={{ ...task, ...overrides }} dragging={false} editable {...handlers} {...props} />);
  return { ...view, handlers };
}

describe("TaskCard", () => {
  it("muestra prioridad, título, descripción y responsable", () => {
    renderCard();

    expect(screen.getByText("Alta")).toBeTruthy();
    expect(screen.getByText("Investigar placas")).toBeTruthy();
    expect(screen.getByText("Buscar sensores compatibles")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Responsable sin vincular")).toBeTruthy();
    expect(screen.getByText("Investigar placas").closest("button")?.title).toBe("Abrir tarea");
  });

  it("marca solo las tareas pendientes vencidas", () => {
    const { rerender, handlers } = renderCard({ dueDate: "2020-01-01", status: "pending" });
    expect(screen.getByText("Vencida")).toBeTruthy();

    rerender(<TaskCard task={{ ...task, dueDate: "2020-01-01", status: "done" }} dragging={false} editable {...handlers} />);
    expect(screen.queryByText("Vencida")).toBeNull();

    rerender(<TaskCard task={{ ...task, dueDate: "", status: "pending" }} dragging={false} editable {...handlers} />);
    expect(screen.queryByText("Vencida")).toBeNull();
  });

  it("abre la tarea al pulsar la tarjeta", () => {
    const { handlers } = renderCard();

    fireEvent.click(screen.getByText("Investigar placas"));

    expect(handlers.onEdit).toHaveBeenCalled();
  });

  it("no abre la tarea al pulsar el asa de arrastre", () => {
    const { container, handlers } = renderCard();

    fireEvent.click(container.querySelector(".grip")!);

    expect(handlers.onEdit).not.toHaveBeenCalled();
  });

  it("marca la tarjeta como arrastrada y la deja en solo lectura", () => {
    const { container } = renderCard({}, { dragging: true, editable: false });

    expect(container.querySelector(".card")?.className).toBe("card dragging");
    expect(screen.getByText("Investigar placas").closest("button")?.title).toBe("Ver tarea (solo lectura)");
  });

  it("vuelve a intentar la imagen cuando cambia la URL", () => {
    const { container, rerender, handlers } = renderCard({ imageUrl: "https://ejemplo.test/rota.png" });
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Imagen no disponible")).toBeTruthy();
    rerender(<TaskCard task={{ ...task, imageUrl: "https://ejemplo.test/nueva.png" }} dragging={false} editable {...handlers} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://ejemplo.test/nueva.png");
  });
});
