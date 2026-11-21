import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "student",
  list: vi.fn(),
}));

vi.mock("../../../lib/server/projects/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? {
      status: "ok",
      project: {
        id: "project1",
        access: {
          user: { userId: "user1", displayName: "Docente", email: "docente@example.com", fullName: null },
          role: mocks.role,
        },
      },
    }
    : { status: mocks.status },
}));

vi.mock("../../../lib/server/projects/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../lib/server/aula-documentos/documents", () => ({
  listAulaDocumentSuite: mocks.list,
}));

import { GET } from "./route";

const endpoint = "https://site.test/api/aula-documentos?project=project1";

describe("API de la suite de Aula Documentos", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.role = "student";
    mocks.list.mockReset();
    mocks.list.mockResolvedValue({ active: [], archived: [], deleted: [] });
  });

  it("lista los documentos del proyecto", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ active: [], archived: [], deleted: [] });
    expect(mocks.list).toHaveBeenCalledWith("project1");
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status).toBe(code);
    }
  });

  it("devuelve 502 si no se pueden leer los documentos", async () => {
    mocks.list.mockRejectedValue(new Error("db"));
    expect((await GET(new Request(endpoint))).status).toBe(502);
  });
});
