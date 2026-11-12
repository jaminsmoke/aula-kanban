import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentDeleteDialog, StudentFormDialog } from "./student-dialogs";
import type { Student } from "../student";

const student: Student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 0,
  accountEmail: "",
};

describe("StudentFormDialog", () => {
  it("cambia el nombre visible de la ficha", () => {
    const onChange = vi.fn();
    render(<StudentFormDialog student={student} onChange={onChange} error="" saving={false} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Añadir alumno" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Nombre visible/), { target: { value: "Grace" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Grace" }));
  });

  it("envía el formulario y muestra el error", () => {
    const onSubmit = vi.fn();
    render(<StudentFormDialog student={student} onChange={vi.fn()} error="La ficha ya existe" saving={false} onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.submit(screen.getByRole("button", { name: "Añadir alumno" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("La ficha ya existe");
  });

  it("titula como edición cuando la ficha ya tiene revisión", () => {
    render(<StudentFormDialog student={{ ...student, revision: 2 }} onChange={vi.fn()} error="" saving onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Editar perfil" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeTruthy();
  });
});

describe("StudentDeleteDialog", () => {
  it("confirma la baja de la ficha", () => {
    const onConfirm = vi.fn();
    render(<StudentDeleteDialog student={student} error="" saving={false} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText(/eliminar la ficha de Ada/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

    expect(onConfirm).toHaveBeenCalled();
  });
});
