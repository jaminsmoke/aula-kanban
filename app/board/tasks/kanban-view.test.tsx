import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import KanbanView from "./kanban-view";
import type { Task } from "../../../lib/domain/task";
import type { Student } from "../../../lib/domain/student";

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Investigar placas",
  description: "",
  imageUrl: "",
  assignee: "",
  assignees: [],
  dueDate: "",
  priority: "high",
  status: "pending",
  createdAt: 1,
  revision: 0,
  ...overrides,
});

const student: Student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 1,
};

function renderBoard(overrides: Partial<Parameters<typeof KanbanView>[0]> = {}) {
  const props = {
    tasks: [task()],
    visible: [task()],
    students: [student],
    search: "",
    filter: "",
    studentFilter: "",
    onSearch: vi.fn(),
    onFilter: vi.fn(),
    onStudentFilter: vi.fn(),
    onClearFilters: vi.fn(),
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
    finished: 1,
    total: 2,
    progress: 50,
    ...overrides,
  };
  const view = render(<KanbanView {...props} />);
  return { ...view, props };
}

describe("KanbanView", () => {
  it("pinta el progreso y las cuatro columnas con sus recuentos", () => {
    renderBoard();

    expect(screen.getByRole("heading", { name: "Tablero de tareas" })).toBeTruthy();
    expect((screen.getByRole("progressbar") as HTMLProgressElement).value).toBe(50);
    expect(screen.getByText("1 de 2 tareas hechas")).toBeTruthy();
    for (const lane of ["Por hacer", "En curso", "En revisión", "Hecho"]) {
      expect(screen.getByRole("region", { name: lane })).toBeTruthy();
    }
    expect(screen.getByText("Investigar placas")).toBeTruthy();
  });

  it("abre el editor de una tarea nueva desde el hero", () => {
    const { props } = renderBoard();

    fireEvent.click(screen.getByRole("button", { name: /Nueva tarea/ }));

    expect(props.onOpenEditor).toHaveBeenCalledWith("pending");
  });

  it("abre Mis tareas con la ficha propia y permite volver a todas", () => {
    const { props } = renderBoard({ ownStudent: student });
    fireEvent.click(screen.getByRole("button", { name: "Mis tareas" }));
    expect(props.onStudentFilter).toHaveBeenCalledWith("s1");

    const active = renderBoard({ ownStudent: student, studentFilter: "s1" });
    fireEvent.click(screen.getByRole("button", { name: "Todas las tareas" }));
    expect(active.props.onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("propaga la búsqueda y los filtros", () => {
    const { props } = renderBoard();

    fireEvent.change(screen.getByLabelText("Buscar tareas"), { target: { value: "sensores" } });
    fireEvent.change(screen.getByLabelText("Filtrar por prioridad"), { target: { value: "low" } });
    fireEvent.change(screen.getByLabelText("Filtrar por alumno"), { target: { value: "s1" } });

    expect(props.onSearch).toHaveBeenCalledWith("sensores");
    expect(props.onFilter).toHaveBeenCalledWith("low");
    expect(props.onStudentFilter).toHaveBeenCalledWith("s1");
  });

  it("oculta las acciones de creación para invitados", () => {
    renderBoard({ isGuest: true });

    expect(screen.queryByRole("button", { name: /Nueva tarea/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Añadir tarea/ })).toBeNull();
  });

  it("muestra el aviso de error y reintenta", () => {
    const { props } = renderBoard({ loadError: "Sin conexión", tasks: null, visible: [] });

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(props.onRetry).toHaveBeenCalled();
    expect(screen.getAllByText("Tablero no disponible").length).toBe(4);
  });

  it("distingue columnas vacías de una búsqueda sin coincidencias", () => {
    renderBoard({ visible: [], filtered: true });

    expect(screen.getAllByText("Sin coincidencias").length).toBe(4);
  });

  it("limpia los filtros cuando no hay coincidencias y devuelve el foco al buscador", async () => {
    const { props } = renderBoard({ visible: [], filtered: true });
    const search = screen.getByLabelText("Buscar tareas");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(props.onClearFilters).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search));
  });
});
