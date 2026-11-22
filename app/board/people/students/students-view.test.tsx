import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentsView from "./students-view";
import type { Student } from "../../../../lib/domain/student";
import type { Task } from "../../../../lib/domain/task";

const student: Student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "Prepara las placas",
  aiHelp: "Revisa las fuentes",
  revision: 1,
};

const task: Task = {
  id: "t1",
  title: "Investigar sensores",
  description: "",
  imageUrl: "",
  assignee: "Ada",
  assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
  dueDate: "",
  priority: "normal",
  status: "active",
  createdAt: 1,
  revision: 0,
};

function renderStudents(overrides: Partial<Parameters<typeof StudentsView>[0]> = {}) {
  const props = {
    projectId: "p1",
    students: [student],
    tasks: [task],
    all: [task],
    allPeople: [student],
    ownStudent: undefined,
    canManage: true,
    loadError: "",
    studentError: "",
    onRetryTasks: vi.fn(),
    onRetryStudents: vi.fn(),
    studentName: null,
    onSelectStudent: vi.fn(),
    layout: "grid" as const,
    onLayout: vi.fn(),
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onOpenTask: vi.fn(),
    ...overrides,
  };
  const view = render(<StudentsView {...props} />);
  return { ...view, props };
}

describe("StudentsView", () => {
  it("lista las fichas y cuenta el grupo", () => {
    const { props } = renderStudents();

    expect(screen.getByText("1 alumnos")).toBeTruthy();
    fireEvent.click(screen.getByText("Ada"));
    expect(props.onSelectStudent).toHaveBeenCalledWith("s1");

    fireEvent.click(screen.getByRole("button", { name: "Vista lista" }));
    expect(props.onLayout).toHaveBeenCalledWith("list");
  });

  it("muestra la ficha con sus datos y tareas asignadas", () => {
    const { props } = renderStudents({ studentName: "s1" });

    expect(screen.getByText("Ficha de alumno")).toBeTruthy();
    expect(screen.getByText("Prepara las placas")).toBeTruthy();
    expect(screen.getByText("Investigar sensores")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
    expect(props.onEdit).toHaveBeenCalledWith(student);
  });

  it("ordena las tareas por vencimiento y estado", () => {
    const tasks: Task[] = [
      { ...task, id: "done", title: "Completada", status: "done", dueDate: "2026-11-01", createdAt: 1 },
      { ...task, id: "soon", title: "Próxima", status: "active", dueDate: "2026-11-25", createdAt: 2 },
      { ...task, id: "none", title: "Sin fecha", status: "pending", dueDate: "", createdAt: 3 },
      { ...task, id: "overdue", title: "Vencida", status: "review", dueDate: "2026-11-20", createdAt: 4 },
    ];
    const { container } = renderStudents({ studentName: "s1", tasks, all: tasks, allPeople: [student] });

    expect([...container.querySelectorAll(".student-task strong")].map((item) => item.textContent)).toEqual([
      "Vencida",
      "Próxima",
      "Sin fecha",
      "Completada",
    ]);
  });

  it("mantiene un nombre largo y las acciones en una ficha sin tareas", () => {
    const longName = "Ada Lovelace de la Rosa de los Vientos y del Río";
    const longStudent = { ...student, name: longName, displayName: longName };
    renderStudents({ studentName: "s1", students: [longStudent], tasks: [], all: [], allPeople: [longStudent] });

    expect(screen.getByRole("heading", { name: longName })).toBeTruthy();
    expect(screen.getByText("Todavía no tiene tareas asignadas.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar perfil" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar perfil" })).toBeTruthy();
  });

  it("omite los datos vacíos y conserva las acciones de perfil", () => {
    const partial = { ...student, role: "", activities: "", aiHelp: "" };
    renderStudents({ studentName: "s1", students: [partial], allPeople: [partial] });

    expect(screen.queryByText("Sin especificar")).toBeNull();
    expect(screen.getByRole("button", { name: "Editar perfil" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar perfil" })).toBeTruthy();
  });

  it("oculta editar y eliminar cuando no hay permiso", () => {
    renderStudents({ studentName: "s1", canManage: false });

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar perfil" })).toBeNull();
  });

  it("avisa cuando la ficha ya no está disponible", () => {
    renderStudents({ studentName: "s-borrada" });

    expect(screen.getByText("Esta ficha ya no está disponible.")).toBeTruthy();
  });

  it("explica el vacío y ofrece el alta con permiso", () => {
    const { props } = renderStudents({ students: [], tasks: [], all: [], allPeople: [] });

    expect(screen.getByRole("heading", { name: "Aún no hay alumnos" })).toBeTruthy();
    expect(screen.getByText("Crea la primera ficha para empezar a asignarle tareas.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vista mosaico" })).toBeNull();

    const actions = screen.getAllByRole("button", { name: "Añadir alumno" });
    fireEvent.click(actions[actions.length - 1]);
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("no ofrece alta sin permiso", () => {
    renderStudents({ students: [], tasks: [], all: [], allPeople: [], canManage: false });

    expect(screen.getByText("Cuando el profesorado cree la primera ficha, aparecerá aquí.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Añadir alumno" })).toBeNull();
  });

  it("abre la pestaña Permisos con la matriz y el rol efectivo", () => {
    renderStudents();

    fireEvent.click(screen.getByRole("button", { name: "Permisos" }));

    expect(screen.getByRole("table", { name: "Capacidades del proyecto por rol" })).toBeTruthy();
    expect(screen.getByText("Asignar libros")).toBeTruthy();
    expect(screen.getByText("Alumnado de este proyecto")).toBeTruthy();
    expect(screen.getByText("1 de 4 capacidades")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Permisos" }).getAttribute("aria-current")).toBe("page");
  });

  it("oculta la pestaña Permisos sin permiso de gestión", () => {
    renderStudents({ canManage: false });

    expect(screen.queryByRole("button", { name: "Permisos" })).toBeNull();
  });

  it("conserva el aviso de error en vez del vacío", () => {
    renderStudents({ students: [], tasks: [], all: [], allPeople: [], studentError: "No se pudieron cargar" });

    expect(screen.queryByText("Aún no hay alumnos")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vista mosaico" })).toBeNull();
  });
});
