import { fireEvent, render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import PeopleEmptyState from "./empty-state";

describe("PeopleEmptyState", () => {
  it("muestra el título, la explicación y la acción", () => {
    const onClick = vi.fn();
    render(<PeopleEmptyState icon={Users} title="Aún no hay alumnos" description="Crea la primera ficha." action={{ label: "Añadir alumno", onClick }} />);

    expect(screen.getByRole("heading", { name: "Aún no hay alumnos" })).toBeTruthy();
    expect(screen.getByText("Crea la primera ficha.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Añadir alumno" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("no muestra acción cuando no hay permiso", () => {
    render(<PeopleEmptyState icon={Users} title="Aún no hay alumnos" description="Cuando haya fichas, aparecerán aquí." />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
