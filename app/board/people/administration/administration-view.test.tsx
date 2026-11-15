import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdministrationView from "./administration-view";

vi.mock("../students/students-view", () => ({
  default: () => <div>Alumnos</div>,
}));
vi.mock("../teachers/teachers-view", () => ({
  default: () => <div>Profesores</div>,
}));
vi.mock("../../store/store-desktop", () => ({
  default: () => <div>Escritorio de Tienda</div>,
}));

const props = {
  students: {} as never,
  teachers: {} as never,
};

describe("AdministrationView", () => {
  it("muestra Tienda en el sidebar y cambia de sección", async () => {
    const onSection = vi.fn();
    const { rerender } = render(<AdministrationView {...props} section="alumnos" onSection={onSection} tienda={{ role: "owner", projectId: "p1" }} />);

    const nav = screen.getByRole("navigation", { name: "Secciones de administración" });
    fireEvent.click(within(nav).getByRole("button", { name: "Tienda" }));
    expect(onSection).toHaveBeenCalledWith("tienda");

    rerender(<AdministrationView {...props} section="tienda" onSection={onSection} tienda={{ role: "owner", projectId: "p1" }} />);
    expect(await screen.findByText("Escritorio de Tienda")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clase" })).toBeNull();
  });
});
