import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskDialog from "./task-dialog";
import { blank } from "../../shared/model";
import type { Task } from "../../../../lib/domain/task";

const task: Task = {
  id: "t1",
  title: "Investigar placas",
  description: "Buscar sensores",
  imageUrl: "",
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
    onRemoveClass: vi.fn(),
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
    expect(screen.getByText("Marta")).toBeTruthy();
    expect(screen.getByText("Media")).toBeTruthy();
    expect(screen.getByText("Sin fecha")).toBeTruthy();
    expect(screen.queryByPlaceholderText("¿Qué hay que hacer?")).toBeNull();
  });

  it("gestiona una lista de responsables con varias filas", () => {
    const students = [
      { section: "s1", name: "Ada", displayName: "Ada", role: "", activities: "", aiHelp: "", revision: 1 },
      { section: "s2", name: "Grace", displayName: "Grace", role: "", activities: "", aiHelp: "", revision: 1 },
    ];
    const { props } = renderDialog({ form: { ...blank, assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] }, students });

    fireEvent.click(screen.getByRole("tab", { name: /Asignaciones/ }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir responsable" }));
    expect(props.onAddAssignee).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Asignar a toda la clase \(2\)/ }));
    expect(props.onAssignClass).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar responsable 1" }));
    expect(props.onRemoveAssignee).toHaveBeenCalledWith(0);
    fireEvent.change(screen.getByRole("combobox", { name: "Responsable 1" }), { target: { value: "student:s2" } });
    expect(props.onAssignee).toHaveBeenCalledWith(0, "student:s2");
  });

  it("muestra contadores, atajos de fecha y prioridad segmentada", () => {
    const { props } = renderDialog({ form: { ...blank, dueDate: "2020-01-01" } });

    expect(screen.getByText("0/120")).toBeTruthy();
    expect(screen.getByText("0/2000")).toBeTruthy();
    expect(screen.getByText("La fecha ya pasó.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sin fecha" }));
    expect(props.onForm).toHaveBeenCalledWith(expect.objectContaining({ dueDate: "" }));

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(props.onForm).toHaveBeenCalledWith(expect.objectContaining({ dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));

    fireEvent.click(screen.getByRole("button", { name: "Alta" }));
    expect(props.onForm).toHaveBeenCalledWith(expect.objectContaining({ priority: "high" }));
  });

  it("etiqueta el botón de reclamación y detalla la eliminación", () => {
    const { props, rerender } = renderDialog({ editor: { task, status: "pending" }, claiming: true });

    expect(screen.getByRole("button", { name: /Asignarme y guardar/ })).toBeTruthy();
    expect(screen.getByText("Asígnate esta tarea y guarda para poder editar sus detalles.")).toBeTruthy();

    rerender(<TaskDialog {...props} claiming={false} deleting />);
    expect(screen.getByText(/no hay papelera/)).toBeTruthy();
    expect(screen.getByText(/Investigar placas/)).toBeTruthy();
  });

  it("bloquea el cierre del modal mientras se guarda", () => {
    renderDialog({ saving: true });

    expect((screen.getByRole("button", { name: "Cerrar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("deja el responsable libre en texto cuando no hay fichas vinculadas", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: /Asignaciones/ }));
    expect(screen.getByPlaceholderText("Sin asignar o responsable en texto")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Responsable 1" })).toBeNull();
  });

  it("cambia entre las pestañas Resumen y Asignaciones", () => {
    renderDialog({ form: { ...blank, assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] }, students: [] });

    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Asignaciones \(1\)/ })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Asignaciones/ }));
    expect(screen.getByRole("tab", { name: /Asignaciones/ }).getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("panel-resumen")?.hasAttribute("hidden")).toBe(true);
    expect(document.getElementById("panel-asignaciones")?.hasAttribute("hidden")).toBe(false);
  });

  it("actualiza la miniatura desde el campo URL y la previsualiza", () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByLabelText(/Miniatura/), { target: { value: "https://ejemplo.com/foto.jpg" } });
    expect(props.onForm).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "https://ejemplo.com/foto.jpg" }));

    const { props: props2 } = renderDialog({ form: { ...blank, imageUrl: "https://ejemplo.com/foto.jpg" } });
    expect(screen.getByAltText("Vista previa de la miniatura")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quitar miniatura" }));
    expect(props2.onForm).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "" }));
  });

  it("deshabilita el título mientras se reclama una tarea", () => {
    renderDialog({ claiming: true });

    expect((screen.getByPlaceholderText("¿Qué hay que hacer?") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/Asígnate esta tarea/)).toBeTruthy();
  });

  it("vuelve al resumen si se envía sin título desde asignaciones", () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole("tab", { name: /Asignaciones/ }));
    fireEvent.submit(screen.getByRole("button", { name: /Crear tarea/ }).closest("form")!);
    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("amplía y reduce la pizarra como popup sin hacer crecer el diálogo", () => {
    const { container } = renderDialog({ editor: { task, status: "pending" } });
    const dialog = screen.getByRole("dialog", { name: "Editar tarea" });
    expect(dialog.className).toBe("");

    fireEvent.click(screen.getByRole("tab", { name: "Pizarra" }));
    expect(dialog.className).toBe("task-dialog-board");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar pizarra a pantalla completa" }));
    // El popup es la misma pizarra en modo fijo; el diálogo no crece.
    expect(dialog.className).toBe("task-dialog-board");
    expect(container.querySelector(".whiteboard-shell")?.className).toContain("expanded");
    expect(screen.getByRole("button", { name: "Reducir pizarra" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Reducir pizarra" }));
    expect(container.querySelector(".whiteboard-shell")?.className).not.toContain("expanded");
    expect(dialog.className).toBe("task-dialog-board");
  });

  it("muestra el error de URL en resumen aunque se envíe desde asignaciones", () => {
    const { props } = renderDialog({ form: { ...blank, title: "Tarea", imageUrl: "no-es-url" } });
    fireEvent.click(screen.getByRole("tab", { name: /Asignaciones/ }));
    fireEvent.submit(screen.getByRole("button", { name: /Crear tarea/ }).closest("form")!);
    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain("URL de imagen válida");
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
