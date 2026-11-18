import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "guest",
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  save: vi.fn(),
  saveIfCurrent: vi.fn(),
  read: vi.fn(),
}));
vi.mock("../../../lib/server/project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "project1", access: { user: { userId: "user1", displayName: "Alumno", email: "alumno@example.com", fullName: null }, role: mocks.role } } }
    : { status: mocks.status },
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));
vi.mock("../../../lib/server/app-documents", () => ({ MAX_APP_DOCUMENT_CHARS: 200_000, saveAppDocument: mocks.save, saveAppDocumentIfCurrent: mocks.saveIfCurrent, readAppDocument: mocks.read }));

import { MAX_APP_DOCUMENT_CHARS } from "../../../lib/server/app-documents";
import { GET, POST } from "./route";

const endpoint = "https://site.test/api/app-documents?project=project1&app=blockly";
const request = (body: string, url = endpoint) => new Request(url, {
  method: "POST", headers: { origin: "https://site.test", "content-type": "application/json" }, body,
});

describe("documentos de apps", () => {
  beforeEach(() => {
    mocks.role = "guest";
    mocks.status = "ok";
    mocks.save.mockReset();
    mocks.saveIfCurrent.mockReset();
    mocks.read.mockReset();
    mocks.read.mockResolvedValue({ state: { code: "inicio" }, updatedAt: 5 });
  });

  it("lee el documento de una app del proyecto", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: { code: "inicio" }, updatedAt: 5 });
    expect(mocks.read).toHaveBeenCalledWith("project1", "blockly");
  });

  it("distingue sin sesión, sin acceso y proyecto inexistente", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404]] as const) {
      mocks.status = status;
      expect((await GET(new Request(endpoint))).status).toBe(code);
    }
  });

  it("rechaza apps que no están en el catálogo", async () => {
    const response = await GET(new Request("https://site.test/api/app-documents?project=project1&app=otra"));
    expect(response.status).toBe(400);
  });

  it("rechaza una mutación sin origen", async () => {
    const response = await POST(new Request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"state":{"code":"x"}}',
    }));
    expect(response.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rechaza una mutación que no es JSON", async () => {
    const response = await POST(new Request(endpoint, {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "text/plain" },
      body: '{"state":{"code":"x"}}',
    }));
    expect(response.status).toBe(415);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("impide a un invitado sobrescribir el documento", async () => {
    expect((await POST(request('{"state":{"code":"x"},"expectedUpdatedAt":5}'))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.saveIfCurrent).not.toHaveBeenCalled();
  });

  it("acepta y serializa un documento válido de un alumno", async () => {
    mocks.role = "student";
    expect((await POST(request('{"state":{"code":"x"}}'))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith({
      projectId: "project1",
      appId: "blockly",
      state: '{"code":"x"}',
      updatedByUserId: "user1",
    });
    expect(mocks.saveIfCurrent).not.toHaveBeenCalled();
  });

  it("guarda cuando la versión esperada sigue vigente", async () => {
    mocks.role = "student";
    mocks.saveIfCurrent.mockResolvedValue({ status: "saved", updatedAt: 9 });

    const response = await POST(request('{"state":{"code":"x"},"expectedUpdatedAt":5}'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true, updatedAt: 9 });
    expect(mocks.saveIfCurrent).toHaveBeenCalledWith({
      projectId: "project1",
      appId: "blockly",
      state: '{"code":"x"}',
      updatedByUserId: "user1",
      expectedUpdatedAt: 5,
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("crea el documento cuando el cliente no conoce una versión", async () => {
    mocks.role = "student";
    mocks.saveIfCurrent.mockResolvedValue({ status: "saved", updatedAt: 7 });

    const response = await POST(request('{"state":{"code":"x"},"expectedUpdatedAt":null}'));

    expect(response.status).toBe(200);
    expect(mocks.saveIfCurrent).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: null }));
  });

  it("devuelve 409 con la versión vigente si otro guardado llegó antes", async () => {
    mocks.role = "student";
    mocks.saveIfCurrent.mockResolvedValue({ status: "conflict", updatedAt: 12 });

    const response = await POST(request('{"state":{"code":"x"},"expectedUpdatedAt":5}'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      accepted: false,
      conflict: true,
      message: "El documento ha cambiado en otra sesión.",
      updatedAt: 12,
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("devuelve 409 si otro cliente creó el documento que se esperaba nuevo", async () => {
    mocks.role = "student";
    mocks.saveIfCurrent.mockResolvedValue({ status: "conflict", updatedAt: 12 });

    const response = await POST(request('{"state":{"code":"x"},"expectedUpdatedAt":null}'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(expect.objectContaining({ conflict: true, updatedAt: 12 }));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("rechaza una versión esperada que no es un entero no negativo", async () => {
    mocks.role = "student";
    for (const expectedUpdatedAt of ["5", -1, 1.5]) {
      const response = await POST(request(JSON.stringify({ state: { code: "x" }, expectedUpdatedAt })));
      expect(response.status).toBe(400);
    }
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.saveIfCurrent).not.toHaveBeenCalled();
  });

  it("rechaza cuerpos excesivos antes de guardarlos", async () => {
    mocks.role = "student";
    expect((await POST(request(JSON.stringify({ state: { value: "x".repeat(MAX_APP_DOCUMENT_CHARS + 1) } })))).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
