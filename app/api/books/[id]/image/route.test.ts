import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { userId: string } | null,
  status: "ok" as "ok" | "forbidden",
  read: vi.fn(),
}));

vi.mock("../../../../../lib/server/auth", () => ({
  getChatGPTUser: async () => mocks.user,
}));
vi.mock("../../../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1" } }
    : { status: mocks.status },
}));
vi.mock("../../../../../lib/server/project-http", () => ({
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : 403,
  }),
}));
vi.mock("../../../../../lib/server/books", () => ({
  readBookImage: mocks.read,
}));

import { GET } from "./route";

const coverEndpoint = "https://site.test/api/books/eso-matematicas-1/image?kind=cover&project=p1";
const context = { params: Promise.resolve({ id: "eso-matematicas-1" }) };

describe("ruta de la imagen del libro", () => {
  beforeEach(() => {
    mocks.user = { userId: "u1" };
    mocks.status = "ok";
    mocks.read.mockReset().mockResolvedValue({
      status: "ok",
      object: { body: "jpg", size: 91351 },
    });
  });

  it("sirve la portada JPEG con caché inmutable", async () => {
    const response = await GET(new Request(coverEndpoint), context);
    expect(response.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("eso-matematicas-1", "cover");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Content-Length")).toBe("91351");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("rechaza tipos de imagen inválidos y ausencias", async () => {
    expect((await GET(new Request("https://site.test/api/books/eso-matematicas-1/image?kind=otra&project=p1"), context)).status).toBe(400);
    mocks.read.mockResolvedValueOnce({ status: "not_found" });
    expect((await GET(new Request(coverEndpoint), context)).status).toBe(404);
    mocks.read.mockResolvedValueOnce({ status: "storage_unavailable" });
    expect((await GET(new Request(coverEndpoint), context)).status).toBe(503);
  });

  it("distingue sin sesión y sin acceso", async () => {
    mocks.user = null;
    expect((await GET(new Request(coverEndpoint), context)).status).toBe(401);
    mocks.user = { userId: "u1" };
    mocks.status = "forbidden";
    expect((await GET(new Request(coverEndpoint), context)).status).toBe(403);
  });
});
