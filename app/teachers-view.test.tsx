import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TeachersView from "./teachers-view";
import { jsonResponse } from "../vitest.setup";
import type { Teacher } from "./teachers/model";

const teacher: Teacher = {
  id: "tch1",
  projectId: "p1",
  name: "Marta",
  displayName: "",
  role: "Profesora",
  activities: "Coordina el grupo",
  aiHelp: "",
  revision: 1,
};

function renderTeachers(overrides: Partial<Parameters<typeof TeachersView>[0]> = {}) {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([teacher])));
  const props = {
    projectId: "p1",
    isAdmin: true,
    ownTeacherId: null,
    tasks: [],
    students: [],
    openTask: vi.fn(),
    ...overrides,
  };
  const view = render(<TeachersView {...props} />);
  return { ...view, props };
}

describe("TeachersView", () => {
  it("lista el profesorado y abre su ficha", async () => {
    renderTeachers();

    fireEvent.click(await screen.findByText("Marta"));

    expect(screen.getByText("Ficha de profesor")).toBeTruthy();
    expect(screen.getByText("Coordina el grupo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar perfil" })).toBeTruthy();
  });

  it("solo ofrece añadir profesor a quien administra", async () => {
    const first = renderTeachers();
    await screen.findByText("Marta");
    expect(screen.getByRole("button", { name: "Añadir profesor" })).toBeTruthy();
    first.unmount();

    renderTeachers({ isAdmin: false });
    await screen.findByText("Marta");
    expect(screen.queryByRole("button", { name: "Añadir profesor" })).toBeNull();
  });
});
