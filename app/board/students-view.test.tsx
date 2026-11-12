import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentsView from "./students-view";
import type { Student } from "../student";
import type { Task } from "../task";

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

  it("oculta editar y eliminar cuando no hay permiso", () => {
    renderStudents({ studentName: "s1", canManage: false });

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar perfil" })).toBeNull();
  });

  it("avisa cuando la ficha ya no está disponible", () => {
    renderStudents({ studentName: "s-borrada" });

    expect(screen.getByText("Esta ficha ya no está disponible.")).toBeTruthy();
  });
});
