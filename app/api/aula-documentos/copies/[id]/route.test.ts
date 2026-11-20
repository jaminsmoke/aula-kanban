// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "student",
  copy: null as Record<string, unknown> | null,
  find: vi.fn(),
  remove: vi.fn(),
  read: vi.fn(),
  storageError: class StorageUnavailableError extends Error {},
}));

vi.mock("../../../../../lib/server/project-access", () => ({
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

vi.mock("../../../../../lib/server/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../../../lib/server/document-copies", () => ({
  findDocumentCopy: mocks.find,
  deleteDocumentCopy: mocks.remove,
}));

vi.mock("../../../../../lib/server/storage", () => ({
  StorageUnavailableError: mocks.storageError,
  readUpload: mocks.read,
}));

import { DELETE, GET } from "./route";

const endpoint = "https://site.test/api/aula-documentos/copies/copy1";
const context = { params: Promise.resolve({ id: "copy1" }) };

beforeEach(() => {
  mocks.status = "ok";
  mocks.role = "student";
  mocks.copy = {
    id: "copy1",
    projectId: "project1",
    title: "Copia",
    format: "aula-document-copy",
    formatVersion: 1,
    schemaVersion: 3,
    sizeBytes: 3,
    ownerUserId: "user1",
    createdAt: 100,
  };
  mocks.find.mockResolvedValue(mocks.copy);
  mocks.remove.mockResolvedValue(true);
  mocks.read.mockResolvedValue({
    status: "ok",
    row: { purpose: "document-copy", projectId: "project1", sizeBytes: 3 },
    object: { body: new Uint8Array([1, 2, 3]) },
  });
});

describe("descarga y borrado de copias", () => {
  it("descarga una copia para un invitado con cabeceras privadas", async () => {
    mocks.role = "guest";
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain("aula-copy-copy1.aula.zip");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("no descarga una copia de otro proyecto", async () => {
    mocks.status = "forbidden";
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(403);
  });

  it("devuelve 404 si la copia no existe", async () => {
    mocks.find.mockResolvedValue(null);
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(404);
  });

  it("borra una copia para un miembro con escritura", async () => {
    const response = await DELETE(new Request(endpoint, {
      method: "DELETE",
      headers: { origin: "https://site.test" },
    }), context);
    expect(response.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith("copy1");
  });

  it("no permite borrar a invitados", async () => {
    mocks.role = "guest";
    const response = await DELETE(new Request(endpoint, {
      method: "DELETE",
      headers: { origin: "https://site.test" },
    }), context);
    expect(response.status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("exige mismo origen para borrar", async () => {
    const response = await DELETE(new Request(endpoint, { method: "DELETE" }), context);
    expect(response.status).toBe(403);
  });

  it("devuelve 503 si R2 no está disponible al descargar", async () => {
    mocks.read.mockResolvedValue({ status: "storage_unavailable" });
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(503);
  });
});
