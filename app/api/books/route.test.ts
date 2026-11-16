import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden",
  list: vi.fn(),
}));

vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1", access: { user: { userId: "u1" } } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : 403,
  }),
}));
vi.mock("../../../lib/server/books", () => ({
  listBooks: mocks.list,
}));

import { GET } from "./route";

const endpoint = "https://site.test/api/books?project=p1";

describe("ruta del catálogo de libros", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.list.mockReset().mockReturnValue([{ id: "eso-matematicas-1", available: false, url: null }]);
  });

  it("lista el catálogo con su procedencia", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("p1");
    const data = (await response.json()) as { books: unknown[] };
    expect(data.books).toEqual([{ id: "eso-matematicas-1", available: false, url: null }]);
  });

  it("distingue sin sesión y sin acceso", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status).toBe(code);
    }
  });
});
