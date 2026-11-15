import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdministrationView from "./administration-view";

vi.mock("../students/students-view", () => ({
  default: () => <div>Alumnos</div>,
}));
vi.mock("../teachers/teachers-view", () => ({
  default: () => <div>Profesores</div>,
}));
vi.mock("../../space/space-view", () => ({
  default: ({ onExit }: { onExit: () => void }) => <div>Escritorio de Tienda<button onClick={onExit}>Clase</button></div>,
}));

const props = {
  students: {} as never,
  teachers: {} as never,
};

describe("AdministrationView", () => {
  it("muestra Tienda en el sidebar y cambia de sección", async () => {
    const onSection = vi.fn();
    const { rerender, container } = render(<AdministrationView {...props} section="alumnos" onSection={onSection} tienda={{ role: "owner", projectId: "p1", onExit: () => {} }} />);

    const nav = screen.getByRole("navigation", { name: "Secciones de administración" });
    fireEvent.click(within(nav).getByRole("button", { name: "Tienda" }));
    expect(onSection).toHaveBeenCalledWith("tienda");

    rerender(<AdministrationView {...props} section="tienda" onSection={onSection} tienda={{ role: "owner", projectId: "p1", onExit: () => {} }} />);
    expect(await screen.findByText("Escritorio de Tienda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clase" })).toBeTruthy();
    expect(container.querySelector(".workspace-exit")).toBeNull();
  });

  it("usa la salida del sidebar para volver a Clase", () => {
    const onExit = vi.fn();
    render(<AdministrationView {...props} section="alumnos" onSection={() => {}} tienda={{ role: "owner", projectId: "p1", onExit }} />);

    fireEvent.click(screen.getByRole("button", { name: "Clase" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
