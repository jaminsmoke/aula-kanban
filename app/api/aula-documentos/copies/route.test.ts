// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAulaDocumentCopy } from "../../../../lib/domain/aula-documentos/copy";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  role: "student",
  list: vi.fn(),
  create: vi.fn(),
  store: vi.fn(),
  validate: vi.fn(() => null),
  quotaError: class DocumentCopyQuotaExceededError extends Error {},
  limitError: class DocumentCopyLimitExceededError extends Error {},
  storageError: class StorageUnavailableError extends Error {},
}));

vi.mock("../../../../lib/server/project-access", () => ({
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

vi.mock("../../../../lib/server/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../../lib/server/document-copies", () => ({
  listDocumentCopies: mocks.list,
  createDocumentCopy: mocks.create,
}));

vi.mock("../../../../lib/server/storage", () => ({
  DocumentCopyQuotaExceededError: mocks.quotaError,
  DocumentCopyLimitExceededError: mocks.limitError,
  StorageUnavailableError: mocks.storageError,
  deleteUpload: vi.fn(),
  storeUpload: mocks.store,
  validateUpload: mocks.validate,
}));

import { GET, POST } from "./route";

const endpoint = "https://site.test/api/aula-documentos/copies?project=project1";

/**
 * Construye una petición multipart con una copia válida.
 * @returns La petición preparada.
 */
async function copyRequest(): Promise<Request> {
  const built = await buildAulaDocumentCopy(
    { schemaVersion: 3, title: "Copia de prueba", content: { type: "doc", content: [] } },
    [],
    { createdAt: "2026-11-20T10:00:00.000Z" },
  );
  if (!built.ok) throw new Error(built.message);
  const form = new FormData();
  form.append("file", new File([built.bytes.slice().buffer as ArrayBuffer], "copia.aula.zip", { type: "application/zip" }));
  const request = new Request(endpoint, {
    method: "POST",
    headers: { origin: "https://site.test" },
  });
  Object.defineProperty(request, "formData", { value: async () => form });
  return request;
}

beforeEach(() => {
  mocks.status = "ok";
  mocks.role = "student";
  mocks.list.mockReset();
  mocks.create.mockReset();
  mocks.store.mockReset();
  mocks.validate.mockReset();
  mocks.validate.mockReturnValue(null);
});

describe("API de copias portables", () => {
  it("lista las copias del proyecto para cualquier miembro", async () => {
    mocks.list.mockResolvedValue([{
      id: "copy1",
      projectId: "project1",
      title: "Copia",
      format: "aula-document-copy",
      formatVersion: 1,
      schemaVersion: 3,
      sizeBytes: 1234,
      ownerUserId: "user1",
      createdAt: 100,
    }]);
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      copies: [{
        id: "copy1",
        title: "Copia",
        format: "aula-document-copy",
        formatVersion: 1,
        schemaVersion: 3,
        sizeBytes: 1234,
        createdAt: 100,
        downloadUrl: "/api/aula-documentos/copies/copy1",
      }],
    });
  });

  it("rechaza una copia sin origen válido", async () => {
    const request = new Request(endpoint, { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("rechaza a invitados antes de leer el archivo", async () => {
    mocks.role = "guest";
    const response = await POST(await copyRequest());
    expect(response.status).toBe(403);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("valida la copia y la guarda con sus metadatos", async () => {
    mocks.store.mockResolvedValue({ id: "copy1", url: "/api/files/copy1" });
    mocks.create.mockResolvedValue({
      id: "copy1",
      projectId: "project1",
      title: "Copia de prueba",
      format: "aula-document-copy",
      formatVersion: 1,
      schemaVersion: 3,
      sizeBytes: 1234,
      ownerUserId: "user1",
      createdAt: 100,
    });

    const response = await POST(await copyRequest());
    expect(response.status).toBe(201);
    expect(mocks.store).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project1",
      purpose: "document-copy",
      origin: "web",
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Copia de prueba",
      schemaVersion: 3,
      ownerUserId: "user1",
    }));
  });

  it("rechaza un ZIP que no es una copia válida", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "rota.zip", { type: "application/zip" }));
    const request = new Request(endpoint, { method: "POST", headers: { origin: "https://site.test" } });
    Object.defineProperty(request, "formData", { value: async () => form });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("distingue cuota llena, máximo de copias y R2 no disponible", async () => {
    mocks.store
      .mockRejectedValueOnce(new mocks.quotaError())
      .mockRejectedValueOnce(new mocks.limitError())
      .mockRejectedValueOnce(new mocks.storageError());

    expect((await POST(await copyRequest())).status).toBe(413);
    expect((await POST(await copyRequest())).status).toBe(409);
    expect((await POST(await copyRequest())).status).toBe(503);
  });
});
