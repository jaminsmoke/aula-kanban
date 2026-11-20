import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { userId: string } | null,
  status: "ok" as "ok" | "forbidden",
  read: vi.fn(),
}));

vi.mock("../../../../../lib/server/access/auth", () => ({
  getChatGPTUser: async () => mocks.user,
}));
vi.mock("../../../../../lib/server/projects/project-access", () => ({
  resolveProject: async () => {
    if (!mocks.user) return { status: "unauthenticated" };
    return mocks.status === "ok"
      ? { status: "ok", project: { id: "p1" } }
      : { status: mocks.status };
  },
}));
vi.mock("../../../../../lib/server/projects/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : 403,
  }),
}));
vi.mock("../../../../../lib/server/books/books", () => ({
  readBookFile: mocks.read,
}));

import { GET } from "./route";

const endpoint = "https://site.test/api/books/eso-matematicas-1/file?project=p1";
const context = { params: Promise.resolve({ id: "eso-matematicas-1" }) };

describe("ruta del archivo del libro", () => {
  beforeEach(() => {
    mocks.user = { userId: "u1" };
    mocks.status = "ok";
    mocks.read.mockReset().mockResolvedValue({
      status: "ok",
      book: { id: "eso-matematicas-1", sizeBytes: 12094989 },
      object: { body: "pdf", size: 12094989 },
    });
  });

  it("sirve el PDF con su tamaño y caché inmutable", async () => {
    const response = await GET(new Request(endpoint), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Length")).toBe("12094989");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("responde 404 para libros no ingeridos y 503 sin bucket", async () => {
    mocks.read.mockResolvedValueOnce({ status: "not_found" });
    expect((await GET(new Request(endpoint), context)).status).toBe(404);
    mocks.read.mockResolvedValueOnce({ status: "storage_unavailable" });
    expect((await GET(new Request(endpoint), context)).status).toBe(503);
  });

  it("distingue sin sesión y sin acceso", async () => {
    mocks.user = null;
    expect((await GET(new Request(endpoint), context)).status).toBe(401);
    mocks.user = { userId: "u1" };
    mocks.status = "forbidden";
    expect((await GET(new Request(endpoint), context)).status).toBe(403);
  });
});
