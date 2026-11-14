import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "student",
  user: vi.fn(async () => ({ userId: "user1" })),
  project: vi.fn(async () => ({ id: "project1", access: { role: "student" } })),
  validate: vi.fn(() => null),
  store: vi.fn(),
}));
vi.mock("../../../lib/server/auth", () => ({ getChatGPTUser: mocks.user }));
vi.mock("../../../lib/server/project", () => ({ validProject: mocks.project }));
vi.mock("../../../lib/server/storage", () => ({
  StorageUnavailableError: class StorageUnavailableError extends Error {},
  storeUpload: mocks.store,
  uploadPurposes: ["task-image"],
  validateUpload: mocks.validate,
}));

import { POST } from "./route";

const endpoint = "https://site.test/api/uploads?project=project1";
const request = (headers: Record<string, string>) => new Request(endpoint, { method: "POST", headers });

describe("guardas de subida", () => {
  beforeEach(() => {
    mocks.role = "student";
    mocks.user.mockClear();
    mocks.project.mockClear();
    mocks.validate.mockClear();
    mocks.store.mockClear();
  });

  it("rechaza una subida sin origen antes de autenticar", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(403);
    expect(mocks.user).not.toHaveBeenCalled();
  });

  it("rechaza una subida de otro origen", async () => {
    const response = await POST(request({ origin: "https://otro.test" }));
    expect(response.status).toBe(403);
    expect(mocks.user).not.toHaveBeenCalled();
  });

  it("acepta el mismo origen y deja pasar la comprobación de invitado", async () => {
    mocks.role = "guest";
    mocks.project.mockResolvedValueOnce({ id: "project1", access: { role: "guest" } });
    const response = await POST(request({ origin: "https://site.test" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Las cuentas invitadas solo pueden consultar el proyecto." });
    expect(mocks.user).toHaveBeenCalledOnce();
  });
});
