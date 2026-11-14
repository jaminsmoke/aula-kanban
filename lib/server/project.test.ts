import { describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "./auth";
import {
  PROJECT_FAILURE_RESPONSES,
  projectFailureResponse,
  resolveProject,
  type Access,
  type ProjectRow,
} from "./project";

const user: ChatGPTUser = { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null };
const project: ProjectRow = { id: "p1", name: "Proyecto", createdAt: 1 };
const access: Access = { user, role: "teacher", studentSection: null, teacherId: null };
const request = (search = "?project=p1") => new Request(`https://site.test/api/tasks${search}`);

function dependencies(overrides: Partial<{
  getUser: () => Promise<typeof user | null>;
  findProject: (id: string) => Promise<ProjectRow | null>;
  accessForUser: (id: string, current: typeof user) => Promise<Access | null>;
}> = {}) {
  return {
    getUser: async () => user,
    findProject: async () => project,
    accessForUser: async () => access,
    ...overrides,
  };
}

describe("resolución de proyecto", () => {
  it("define el estado y el mensaje de cada fallo", async () => {
    for (const [failure, expected] of Object.entries(PROJECT_FAILURE_RESPONSES)) {
      const response = projectFailureResponse(failure as keyof typeof PROJECT_FAILURE_RESPONSES);
      expect(response.status).toBe(expected.status);
      expect(await response.json()).toEqual({ message: expected.message });
    }
    expect(PROJECT_FAILURE_RESPONSES.unauthenticated.status).toBe(401);
    expect(PROJECT_FAILURE_RESPONSES.forbidden.status).toBe(403);
    expect(PROJECT_FAILURE_RESPONSES.not_found.status).toBe(404);
    expect(PROJECT_FAILURE_RESPONSES.invalid.status).toBe(400);
  });

  it("responde sin sesión antes de consultar el proyecto", async () => {
    const findProject = vi.fn();
    const result = await resolveProject(request(), dependencies({ getUser: async () => null, findProject }));
    expect(result).toEqual({ status: "unauthenticated" });
    expect(findProject).not.toHaveBeenCalled();
  });

  it("rechaza un identificador demasiado largo sin consultar la base", async () => {
    const findProject = vi.fn();
    const result = await resolveProject(request(`?project=${"x".repeat(81)}`), dependencies({ findProject }));
    expect(result).toEqual({ status: "invalid" });
    expect(findProject).not.toHaveBeenCalled();
  });

  it("distingue un proyecto inexistente de uno sin acceso", async () => {
    const accessForUser = vi.fn();
    expect(await resolveProject(request(), dependencies({ findProject: async () => null, accessForUser }))).toEqual({ status: "not_found" });
    expect(accessForUser).not.toHaveBeenCalled();
    expect(await resolveProject(request(), dependencies({ accessForUser: async () => null }))).toEqual({ status: "forbidden" });
  });

  it("devuelve el proyecto con acceso cuando todo es válido", async () => {
    expect(await resolveProject(request(), dependencies())).toEqual({ status: "ok", project: { ...project, access } });
  });

  it("usa el proyecto por defecto cuando falta el parámetro", async () => {
    const findProject = vi.fn(async (id: string) => ({ ...project, id }));
    const result = await resolveProject(request(""), dependencies({ findProject }));
    expect(findProject).toHaveBeenCalledWith("default");
    expect(result).toMatchObject({ status: "ok", project: { id: "default" } });
  });
});
