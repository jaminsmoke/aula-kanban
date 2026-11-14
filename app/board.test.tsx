import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Board from "./board";

vi.mock("./board/projects/use-projects", () => ({
  useProjects: () => ({
    projects: [], projectsLoaded: true, projectId: "", activeProject: undefined,
    owner: false, admin: false, hasProjectLink: false, refreshProjects: vi.fn(),
  }),
}));
vi.mock("./board/projects/use-invitations", () => ({
  useInvitations: () => ({ invitations: [], invitationsLoaded: true, refreshInvitations: vi.fn() }),
}));
vi.mock("./board/shared/use-board-data", () => ({ useBoardData: () => ({}) }));
vi.mock("./board/projects/use-project-actions", () => ({ useProjectActions: () => ({}) }));
vi.mock("./board/tasks/use-tasks", () => ({ useTasks: () => ({}) }));
vi.mock("./board/people/use-students", () => ({ useStudents: () => ({}) }));
vi.mock("./board/docs/docs-view", () => ({ default: () => <h1>Documentación de prueba</h1> }));

describe("navegación sin proyecto", () => {
  it("permite abrir ajustes y documentación desde la pantalla de acceso", async () => {
    render(<Board user={{ displayName: "Ejemplo", email: "ejemplo@sites.test" }} />);
    expect(screen.getByRole("heading", { name: "Aún no tienes acceso a un proyecto" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }));
    expect(await screen.findByRole("heading", { name: "Cuenta" })).toBeTruthy();
    expect(screen.getAllByText("ejemplo@sites.test").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Documentación" }));
    expect(await screen.findByRole("heading", { name: "Documentación de prueba" })).toBeTruthy();
  });
});
