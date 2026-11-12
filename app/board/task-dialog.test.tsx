import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskDialog from "./task-dialog";
import { blank } from "./model";
import type { Task } from "../task";

const task: Task = {
  id: "t1",
  title: "Investigar placas",
  description: "Buscar sensores",
  assignee: "Ada",
  assignees: [],
  dueDate: "",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 0,
  creator: "Marta",
};

function renderDialog(overrides: Partial<Parameters<typeof TaskDialog>[0]> = {}) {
  const props = {
    editor: { status: "pending" as const },
    form: { ...blank, title: "" },
    onForm: vi.fn(),
    formError: "",
    saving: false,
    deleting: false,
    onDeleting: vi.fn(),
    canManage: true,
    canEditTask: () => true,
    students: [],
    teachers: [],
    claiming: false,
    onAddAssignee: vi.fn(),
    onRemoveAssignee: vi.fn(),
    onAssignee: vi.fn(),
    onAssignClass: vi.fn(),
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  const view = render(<TaskDialog {...props} />);
  return { ...view, props };
}

describe("TaskDialog", () => {
  it("edita el formulario de una tarea nueva", () => {
    const { props } = renderDialog();

    expect(screen.getByRole("dialog", { name: "Nueva tarea" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("¿Qué hay que hacer?"), { target: { value: "Sensores" } });

    expect(props.onForm).toHaveBeenCalledWith(expect.objectContaining({ title: "Sensores" }));
  });

  it("envía el formulario y muestra el error de guardado", () => {
    const { props } = renderDialog({ formError: "No se pudo guardar" });

    fireEvent.submit(screen.getByRole("button", { name: /Crear tarea/ }).closest("form")!);

    expect(props.onSubmit).toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("No se pudo guardar");
  });

  it("pide confirmación antes de eliminar la tarea", () => {
    const { props, rerender } = renderDialog({ editor: { task, status: "pending" } });

    fireEvent.click(screen.getByRole("button", { name: /Eliminar/ }));
    expect(props.onDeleting).toHaveBeenCalledWith(true);

    rerender(<TaskDialog {...props} deleting />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

    expect(props.onDelete).toHaveBeenCalledWith(task);
  });

  it("muestra en solo lectura las tareas que no se pueden editar", () => {
    renderDialog({ editor: { task, status: "pending" }, canEditTask: () => false });

    expect(screen.getByRole("dialog", { name: "Detalle de la tarea" })).toBeTruthy();
    expect(screen.getByText("Creada por: Marta")).toBeTruthy();
    expect(screen.queryByPlaceholderText("¿Qué hay que hacer?")).toBeNull();
  });

  it("gestiona una lista de responsables con varias filas", () => {
    const students = [
      { section: "s1", name: "Ada", displayName: "Ada", role: "", activities: "", aiHelp: "", revision: 1 },
      { section: "s2", name: "Grace", displayName: "Grace", role: "", activities: "", aiHelp: "", revision: 1 },
    ];
    const { props } = renderDialog({ form: { ...blank, assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] }, students });

    fireEvent.click(screen.getByRole("button", { name: "Añadir responsable" }));
    expect(props.onAddAssignee).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Asignar a toda la clase" }));
    expect(props.onAssignClass).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar responsable 1" }));
    expect(props.onRemoveAssignee).toHaveBeenCalledWith(0);
    fireEvent.change(screen.getByRole("combobox", { name: "Responsable 1" }), { target: { value: "student:s2" } });
    expect(props.onAssignee).toHaveBeenCalledWith(0, "student:s2");
  });

  it("deja el responsable libre en texto cuando no hay fichas vinculadas", () => {
    renderDialog();

    expect(screen.getByPlaceholderText("Sin asignar o responsable en texto")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Responsable 1" })).toBeNull();
  });

  it("deshabilita el título mientras se reclama una tarea", () => {
    renderDialog({ claiming: true });

    expect((screen.getByPlaceholderText("¿Qué hay que hacer?") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/Asígnate esta tarea/)).toBeTruthy();
  });
});
