import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden",
  role: "teacher" as string,
  list: vi.fn(),
  set: vi.fn(),
}));

vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1", access: { user: { userId: "u1" }, role: mocks.role, studentSection: null, teacherId: null } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : 403,
  }),
}));
vi.mock("../../../lib/server/project-books", () => {
  class ProjectBooksError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ProjectBooksError,
    listProjectBooks: mocks.list,
    parseProjectBooks: (body: unknown) => {
      if (!body || typeof body !== "object" || !Array.isArray((body as { bookIds?: unknown }).bookIds)) {
        throw new ProjectBooksError("Falta la lista de libros (`bookIds`).", 400);
      }
      return (body as { bookIds: string[] }).bookIds;
    },
    setProjectBooks: mocks.set,
  };
});

import { GET, PUT } from "./route";

const endpoint = "https://site.test/api/project-books?project=p1";
const post = (body: unknown) => new Request(endpoint, { method: "PUT", body: JSON.stringify(body) });

describe("ruta de project-books", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.role = "teacher";
    mocks.list.mockReset().mockResolvedValue([{ id: "eso-matematicas-1", enabled: true }]);
    mocks.set.mockReset().mockResolvedValue(["eso-matematicas-1"]);
  });

  it("lista los libros con su habilitación", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("p1");
    const data = (await response.json()) as { books: unknown[] };
    expect(data.books).toEqual([{ id: "eso-matematicas-1", enabled: true }]);
  });

  it("guarda la lista completa como el profesor del proyecto", async () => {
    const response = await PUT(post({ bookIds: ["eso-matematicas-1"] }));
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith("p1", ["eso-matematicas-1"]);
  });

  it("deja guardar a dueño y administrador", async () => {
    for (const role of ["owner", "admin"]) {
      mocks.role = role;
      expect((await PUT(post({ bookIds: [] }))).status).toBe(200);
    }
  });

  it("impide guardar a alumnos e invitados", async () => {
    for (const role of ["student", "guest"]) {
      mocks.role = role;
      expect((await PUT(post({ bookIds: [] }))).status).toBe(403);
    }
  });

  it("distingue sin sesión y sin acceso", async () => {
    mocks.status = "unauthenticated";
    expect((await GET(new Request(endpoint))).status).toBe(401);
    mocks.status = "forbidden";
    expect((await GET(new Request(endpoint))).status).toBe(403);
  });
});
