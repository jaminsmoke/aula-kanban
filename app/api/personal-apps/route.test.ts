import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden",
  list: vi.fn(),
  set: vi.fn(),
  describe: vi.fn(),
}));

vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1", access: { user: { userId: "u1", displayName: "Ada", email: "ada@example.com", fullName: null }, role: "student", studentSection: "s1", teacherId: null } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : 403,
  }),
}));
vi.mock("../../../lib/server/personal-apps", () => {
  class PersonalAppsError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    PersonalAppsError,
    listPersonalApps: mocks.list,
    parsePersonalItems: (body: unknown) => {
      if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
        throw new PersonalAppsError("Revisa la selección de herramientas.", 400);
      }
      return (body as { items: unknown[] }).items;
    },
    setPersonalApps: mocks.set,
    describePersonalApps: mocks.describe,
  };
});

import { GET, PUT } from "./route";

const endpoint = "https://site.test/api/personal-apps?project=p1";
const request = (method: string, body?: unknown) => new Request(endpoint, {
  method,
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const described = [{ id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas", installed: true }];

describe("ruta del espacio personal", () => {
  beforeEach(() => {
    mocks.status = "ok";
    mocks.list.mockReset().mockResolvedValue([{ id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas", installed: true }]);
    mocks.set.mockReset().mockResolvedValue([{ id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas", installed: true }]);
    mocks.describe.mockReset().mockReturnValue(described);
  });

  it("lee las herramientas disponibles con su preferencia", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("p1", "u1");
    const data = (await response.json()) as { apps: unknown[] };
    expect(data.apps).toEqual(described);
  });

  it("guarda la selección completa y nunca instala", async () => {
    const response = await PUT(request("PUT", { items: [{ id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas" }] }));
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith("p1", "u1", [{ id: "mermaid", favorite: true, position: 0, folder: "Mis diagramas" }]);
  });

  it("rechaza un cuerpo inválido sin guardar", async () => {
    const response = await PUT(request("PUT", { items: "no" }));
    expect(response.status).toBe(400);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("distingue sin sesión y sin acceso", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status).toBe(code);
    }
  });
});
