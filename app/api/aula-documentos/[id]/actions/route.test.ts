import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "student",
  duplicate: vi.fn(),
  rename: vi.fn(),
  change: vi.fn(),
}));

vi.mock("../../../../../lib/server/projects/project-access", () => ({
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

vi.mock("../../../../../lib/server/projects/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../../../lib/server/aula-documentos/documents", () => ({
  duplicateAulaDocument: mocks.duplicate,
  renameAulaDocument: mocks.rename,
  changeAulaDocumentStatus: mocks.change,
}));

import { POST } from "./route";

const endpoint = "https://site.test/api/aula-documentos/legacy/actions?project=project1";
const context = { params: Promise.resolve({ id: "legacy" }) };
const document = { id: "legacy", title: "Clase", excerpt: "", status: "active", createdAt: 1, updatedAt: 2, archivedAt: null, createdBy: null, updatedBy: null };

/**
 * Construye una petición de acción.
 * @param body - Cuerpo.
 * @returns La petición.
 */
function request(body: unknown) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin: "https://site.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("acciones de la suite de Aula Documentos", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.role = "student";
    mocks.duplicate.mockReset();
    mocks.rename.mockReset();
    mocks.change.mockReset();
    mocks.duplicate.mockResolvedValue({ status: "created", document: { ...document, id: "copy1" } });
    mocks.rename.mockResolvedValue({ ...document, title: "Nuevo" });
    mocks.change.mockResolvedValue({ ...document, status: "archived" });
  });

  it("duplica, renombra y cambia el estado", async () => {
    expect((await POST(request({ action: "duplicate" }), context)).status).toBe(201);
    expect(mocks.duplicate).toHaveBeenCalledWith("project1", "legacy", "user1");

    const renamed = await POST(request({ action: "rename", title: "Nuevo" }), context);
    expect(await renamed.json()).toEqual({ document: { ...document, title: "Nuevo" } });
    expect(mocks.rename).toHaveBeenCalledWith("project1", "legacy", "Nuevo", "user1");

    for (const [action, status] of [["archive", "archived"], ["delete", "deleted"], ["restore", "active"]] as const) {
      mocks.change.mockResolvedValue({ ...document, status });
      expect((await POST(request({ action }), context)).status).toBe(200);
      expect(mocks.change).toHaveBeenCalledWith("project1", "legacy", status, "user1");
    }
  });

  it("rechaza invitados, acciones inválidas y documentos ausentes", async () => {
    mocks.role = "guest";
    expect((await POST(request({ action: "rename", title: "Nuevo" }), context)).status).toBe(403);
    mocks.role = "student";
    expect((await POST(request({ action: "otra" }), context)).status).toBe(400);
    mocks.rename.mockResolvedValue(null);
    expect((await POST(request({ action: "rename", title: "Nuevo" }), context)).status).toBe(404);
  });
});
