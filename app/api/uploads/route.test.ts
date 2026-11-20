import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "student",
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  validate: vi.fn(() => null),
  store: vi.fn(),
  QuotaError: class UploadQuotaExceededError extends Error {},
}));
vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "project1", access: { user: { userId: "user1", displayName: "Alumno", email: "alumno@example.com", fullName: null }, role: mocks.role } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));
vi.mock("../../../lib/server/storage", () => ({ storeUpload: mocks.store }));
vi.mock("../../../lib/server/storage/repository", () => ({
  StorageUnavailableError: class StorageUnavailableError extends Error {},
}));
vi.mock("../../../lib/server/storage/quota", () => ({
  UploadQuotaExceededError: mocks.QuotaError,
  uploadPurposes: ["task-image", "document-image"],
  validateUpload: mocks.validate,
}));

import { POST } from "./route";

const endpoint = "https://site.test/api/uploads?project=project1";
const request = (headers: Record<string, string>) => new Request(endpoint, { method: "POST", headers });
const uploadRequest = (purpose: string, type: string, content = "png") => {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", new File([content], "archivo", { type }));
  const request = new Request(endpoint, { method: "POST", headers: { origin: "https://site.test" } });
  Object.defineProperty(request, "formData", { value: async () => form });
  return request;
};

describe("guardas de subida", () => {
  beforeEach(() => {
    mocks.role = "student";
    mocks.status = "ok";
    mocks.validate.mockClear();
    mocks.store.mockClear();
  });

  it("rechaza una subida sin origen antes de autenticar", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(403);
  });

  it("rechaza una subida de otro origen", async () => {
    const response = await POST(request({ origin: "https://otro.test" }));
    expect(response.status).toBe(403);
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await POST(request({ origin: "https://site.test" }))).status).toBe(code);
    }
  });

  it("acepta el mismo origen y deja pasar la comprobación de invitado", async () => {
    mocks.role = "guest";
    const response = await POST(request({ origin: "https://site.test" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Las cuentas invitadas solo pueden consultar el proyecto." });
  });

  it("sube una imagen de documento con la finalidad validada", async () => {
    mocks.store.mockResolvedValue({ id: "upload1", url: "/api/files/upload1" });
    const response = await POST(uploadRequest("document-image", "image/png"));
    expect(response.status).toBe(201);
    expect(mocks.validate).toHaveBeenCalledWith("document-image", "image/png", 3);
    expect(mocks.store).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project1",
      purpose: "document-image",
      origin: "web",
    }));
  });

  it("devuelve 413 cuando la cuota de imágenes está llena", async () => {
    mocks.store.mockRejectedValue(new mocks.QuotaError());
    const response = await POST(uploadRequest("document-image", "image/png"));
    expect(response.status).toBe(413);
    expect(((await response.json()) as { message: string }).message).toContain("cuota de imágenes");
  });
});
