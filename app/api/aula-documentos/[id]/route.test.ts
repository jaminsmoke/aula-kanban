import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "student",
  read: vi.fn(),
  save: vi.fn(),
}));

vi.mock("../../../../lib/server/projects/project-access", () => ({
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

vi.mock("../../../../lib/server/projects/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../../lib/server/aula-documentos/documents", () => ({
  readAulaDocument: mocks.read,
  saveAulaDocumentIfCurrent: mocks.save,
}));

import { GET, POST } from "./route";

const endpoint = "https://site.test/api/aula-documentos/legacy?project=project1";
const context = { params: Promise.resolve({ id: "legacy" }) };
const document = {
  id: "legacy",
  projectId: "project1",
  title: "Clase",
  excerpt: "Hola",
  status: "active",
  createdAt: 1,
  updatedAt: 5,
  archivedAt: null,
  createdBy: null,
  updatedBy: null,
  state: { schemaVersion: 3, title: "Clase", content: { type: "doc", content: [] } },
};

/**
 * Crea una petición de guardado.
 * @param body - Cuerpo JSON.
 * @param headers - Cabeceras adicionales.
 * @returns La petición.
 */
function saveRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin: "https://site.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("API de un documento de Aula Documentos", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.role = "student";
    mocks.read.mockReset();
    mocks.save.mockReset();
    mocks.read.mockResolvedValue(document);
    mocks.save.mockResolvedValue({ status: "saved", updatedAt: 9 });
  });

  it("lee un documento del proyecto", async () => {
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ document });
    expect(mocks.read).toHaveBeenCalledWith("project1", "legacy");
  });

  it("devuelve 404 si el documento no existe", async () => {
    mocks.read.mockResolvedValue(null);
    expect((await GET(new Request(endpoint), context)).status).toBe(404);
  });

  it("rechaza a invitados antes de leer el cuerpo", async () => {
    mocks.role = "guest";
    expect((await POST(saveRequest({ state: document.state }), context)).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rechaza origen y tipo de contenido no válidos", async () => {
    expect((await POST(new Request(endpoint, { method: "POST" }), context)).status).toBe(403);
    expect((await POST(saveRequest({ state: document.state }, { "content-type": "text/plain" }), context)).status).toBe(415);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("guarda con la versión vigente", async () => {
    const response = await POST(saveRequest({ state: document.state, expectedUpdatedAt: 5 }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true, updatedAt: 9 });
    expect(mocks.save).toHaveBeenCalledWith({
      projectId: "project1",
      id: "legacy",
      state: document.state,
      updatedByUserId: "user1",
      expectedUpdatedAt: 5,
    });
  });

  it("devuelve conflicto sin sobrescribir", async () => {
    mocks.save.mockResolvedValue({ status: "conflict", updatedAt: 12 });
    const response = await POST(saveRequest({ state: document.state, expectedUpdatedAt: 5 }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(expect.objectContaining({ conflict: true, updatedAt: 12 }));
  });

  it("traduce cuerpo inválido, demasiado grande y estado inválido", async () => {
    expect((await POST(saveRequest({}), context)).status).toBe(400);
    expect((await POST(new Request(endpoint, {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: "x".repeat(200_001),
    }), context)).status).toBe(413);
    mocks.save.mockResolvedValue({ status: "too-large" });
    expect((await POST(saveRequest({ state: document.state }), context)).status).toBe(413);
    mocks.save.mockResolvedValue({ status: "invalid" });
    expect((await POST(saveRequest({ state: document.state }), context)).status).toBe(400);
  });

  it("no guarda un documento que no existe", async () => {
    mocks.read.mockResolvedValue(null);
    expect((await POST(saveRequest({ state: document.state }), context)).status).toBe(404);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
