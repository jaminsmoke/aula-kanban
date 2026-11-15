import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "u1", email: "u1@example.com" } as null | { userId: string; email: string },
  found: { status: "ok" } as Record<string, unknown>,
  resolved: { status: "ok" } as { status: string },
}));

vi.mock("../../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../../lib/server/project", () => ({
  resolveProject: async () => mocks.resolved,
  projectFailureResponse: (status: string) => new Response(status, { status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400 }),
}));
vi.mock("../../../../lib/server/storage", () => ({ readUpload: async () => mocks.found }));

import { GET } from "./route";

const context = { params: Promise.resolve({ id: "f1" }) };
const row = { projectId: "p1", mimeType: "text/plain", sizeBytes: 4 };
const ok = { status: "ok", row, object: { body: new Response("hola").body! } };

describe("GET /api/files/[id]", () => {
  beforeEach(() => {
    mocks.user = { userId: "u1", email: "u1@example.com" };
    mocks.resolved = { status: "ok" };
    mocks.found = ok;
  });

  it("sirve el archivo con su tipo y tamaño", async () => {
    const response = await GET(new Request("https://site.test/api/files/f1"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.headers.get("content-length")).toBe("4");
    expect(await response.text()).toBe("hola");
  });

  it("distingue que falta el almacenamiento de que el archivo no exista", async () => {
    mocks.found = { status: "storage_unavailable" };
    const unavailable = await GET(new Request("https://site.test/api/files/f1"), context);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ message: "El almacenamiento de archivos no está configurado en este despliegue." });

    mocks.found = { status: "object_missing" };
    expect((await GET(new Request("https://site.test/api/files/f1"), context)).status).toBe(404);
    mocks.found = { status: "not_found" };
    expect((await GET(new Request("https://site.test/api/files/f1"), context)).status).toBe(404);
  });

  it("mantiene los fallos de sesión y de acceso del proyecto", async () => {
    mocks.user = null;
    expect((await GET(new Request("https://site.test/api/files/f1"), context)).status).toBe(401);
    mocks.user = { userId: "u1", email: "u1@example.com" };
    mocks.resolved = { status: "forbidden" };
    expect((await GET(new Request("https://site.test/api/files/f1"), context)).status).toBe(403);
  });
});
