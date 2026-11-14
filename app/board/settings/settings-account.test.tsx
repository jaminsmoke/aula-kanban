import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Project } from "../shared/model";
import SettingsAccount from "./settings-account";

const user = { displayName: "Seedy", email: "seedy@sites.test" };
const project: Project = {
  id: "p1",
  name: "Pruebas",
  createdAt: 1,
  role: "teacher",
  studentSection: null,
  teacherId: "t1",
};

describe("SettingsAccount", () => {
  it("muestra cuenta, permisos, proyecto, rol y salida", () => {
    render(<SettingsAccount user={user} projectsLoaded owner admin={false} activeProject={project} />);

    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeTruthy();
    expect(screen.getByText("Seedy")).toBeTruthy();
    expect(screen.getByText("seedy@sites.test")).toBeTruthy();
    expect(screen.getByText("Propietario y administrador")).toBeTruthy();
    expect(screen.getByText("Pruebas")).toBeTruthy();
    expect(screen.getByText("Profesor")).toBeTruthy();
    expect(screen.getByText(/independientes de la propiedad del Site/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Cerrar sesión/ }).getAttribute("href")).toContain("/signout-with-chatgpt");
  });

  it("muestra consulta, ausencia de proyecto y rol sin acceso", () => {
    const view = render(<SettingsAccount user={user} projectsLoaded={false} owner={false} admin={false} />);

    expect(screen.getAllByText("Consultando…")).toHaveLength(2);
    expect(screen.getByText("Ninguno")).toBeTruthy();

    view.rerender(<SettingsAccount user={user} projectsLoaded owner={false} admin={false} />);
    expect(screen.queryByText("Consultando…")).toBeNull();
    expect(screen.getByText("Sin acceso a un proyecto activo")).toBeTruthy();
  });

  it("distingue el permiso de administrador", () => {
    render(<SettingsAccount user={user} projectsLoaded owner={false} admin activeProject={{ ...project, role: "student" }} />);

    expect(screen.getByText("Administrador")).toBeTruthy();
    expect(screen.getByText("Alumno")).toBeTruthy();
  });
});
