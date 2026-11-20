import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { userId: "u1", email: "docente@example.com" } as { userId: string; email: string } | null,
  capability: true,
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  list: vi.fn(),
  set: vi.fn(),
}));

vi.mock("../../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../lib/server/capabilities", () => ({ tieneCapacidad: async () => mocks.capability }));
vi.mock("../../../lib/server/apps", () => ({
  listInstalledApps: mocks.list,
  setAppInstalled: mocks.set,
  MANAGE_APPS_FORBIDDEN: "Solo el propietario o un administrador pueden gestionar aplicaciones.",
}));
vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? {
      status: "ok",
      project: {
        id: "p1",
        access: {
          user: { userId: "u1", displayName: "Docente", email: "docente@example.com", fullName: null },
          role: "owner",
          studentSection: null,
          teacherId: null,
        },
      },
    }
    : { status: mocks.status },
}));

import { GET, POST } from "./route";

const endpoint = "https://site.test/api/space-apps?project=p1";
const apps = [
  { id: "excalidraw", status: "installed", version: "1.0.0" },
  { id: "calculadora", status: "not_installed", version: null },
];

/**
 * Construye una mutación JSON con el mismo origen de la web.
 * @param body - Cuerpo que se serializa.
 * @param headers - Cabeceras que sustituyen a las de la web.
 * @returns La petición lista para la ruta.
 */
function mutation(body: unknown, headers: Record<string, string> = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { origin: "https://site.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.user = { userId: "u1", email: "docente@example.com" };
  mocks.capability = true;
  mocks.status = "ok";
  mocks.list.mockReset();
  mocks.set.mockReset();
  mocks.list.mockResolvedValue(apps);
  mocks.set.mockResolvedValue({ id: "excalidraw", status: "installed", version: "1.0.0" });
});

describe("contrato de /api/space-apps", () => {
  it("lista el estado de las apps sin exponer URLs", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      apps: [
        { id: "excalidraw", status: "installed", url: null, version: "1.0.0" },
        { id: "calculadora", status: "not_installed", url: null, version: null },
      ],
    });
    expect(mocks.list).toHaveBeenCalledOnce();
  });

  it("responde 502 si no puede leer el catálogo instalado", async () => {
    mocks.list.mockRejectedValue(new Error("fallo"));
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "No se pudo consultar las aplicaciones instaladas." });
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente antes de listar", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status, status).toBe(code);
    }
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("exige sesión y capacidad antes de instalar", async () => {
    mocks.user = null;
    expect((await POST(mutation({ id: "excalidraw", action: "install" }))).status).toBe(401);

    mocks.user = { userId: "u1", email: "docente@example.com" };
    mocks.capability = false;
    const denied = await POST(mutation({ id: "excalidraw", action: "install" }));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ message: "Solo el propietario o un administrador pueden gestionar aplicaciones." });
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("valida la app y la acción con el esquema cerrado", async () => {
    for (const body of [{ id: "excalidraw" }, { id: "no-existe", action: "install" }, { id: "excalidraw", action: "install", extra: 1 }]) {
      expect((await POST(mutation(body))).status, JSON.stringify(body)).toBe(400);
    }
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("instala y desinstala para la cuenta autenticada", async () => {
    const installed = await POST(mutation({ id: "excalidraw", action: "install" }));
    expect(installed.status).toBe(200);
    expect(await installed.json()).toEqual({ accepted: true });
    expect(mocks.set).toHaveBeenLastCalledWith("u1", "excalidraw", true);

    await POST(mutation({ id: "excalidraw", action: "uninstall" }));
    expect(mocks.set).toHaveBeenLastCalledWith("u1", "excalidraw", false);
  });

  it("resuelve el proyecto después de validar el cuerpo", async () => {
    mocks.status = "not_found";
    expect((await POST(mutation({ id: "excalidraw", action: "install" }))).status).toBe(404);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("exige mismo origen y JSON antes de instalar", async () => {
    const noOrigin = new Request(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect((await POST(noOrigin)).status).toBe(403);

    const wrongType = new Request(endpoint, { method: "POST", headers: { origin: "https://site.test", "content-type": "text/plain" }, body: "{}" });
    expect((await POST(wrongType)).status).toBe(415);
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
