import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "teacher",
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
  statusResult: vi.fn(),
  migrate: vi.fn(),
  rollback: vi.fn(),
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
  projectFailureResponse: (status: string) => new Response(JSON.stringify({ message: status }), {
    status: status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : status === "not_found" ? 404 : 400,
  }),
}));

vi.mock("../../../../lib/server/aula-documentos-migration", () => ({
  readAulaMigrationStatus: mocks.statusResult,
  migrateAulaDocuments: mocks.migrate,
  rollbackAulaMigration: mocks.rollback,
}));

import { GET, POST } from "./route";

const endpoint = "https://site.test/api/aula-documentos/migration?project=project1";
const request = (body: unknown) => new Request(endpoint, {
  method: "POST",
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("migración de Aula Documentos", () => {
  beforeEach(() => {
    mocks.role = "teacher";
    mocks.status = "ok";
    mocks.statusResult.mockReset();
    mocks.migrate.mockReset();
    mocks.rollback.mockReset();
    mocks.statusResult.mockResolvedValue({
      aula: { exists: false, updatedAt: null },
      sources: [{ source: "mermaid", exists: true, updatedAt: 5, valid: true }],
      migration: { active: false, createdAt: null },
    });
  });

  it("devuelve el estado de los orígenes", async () => {
    const response = await GET(new Request(endpoint));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      sources: [{ source: "mermaid", exists: true, valid: true }],
    });
    expect(mocks.statusResult).toHaveBeenCalledWith("project1");
  });

  it("impide que un invitado migre o revierta", async () => {
    mocks.role = "guest";
    expect((await POST(request({ action: "migrate" }))).status).toBe(403);
    expect(mocks.migrate).not.toHaveBeenCalled();
    expect(mocks.rollback).not.toHaveBeenCalled();
  });

  it("migra y devuelve el documento resultante", async () => {
    mocks.migrate.mockResolvedValue({
      status: "migrated",
      document: { title: "Documentos migrados" },
      updatedAt: 12,
      sources: ["mermaid"],
      warnings: [],
    });
    const response = await POST(request({ action: "migrate" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      action: "migrate",
      status: "migrated",
      document: { title: "Documentos migrados" },
      updatedAt: 12,
    });
    expect(mocks.migrate).toHaveBeenCalledWith({ projectId: "project1", userId: "user1" });
  });

  it("revierte la migración", async () => {
    mocks.rollback.mockResolvedValue({
      status: "rolled-back",
      document: null,
      updatedAt: null,
      sources: ["mermaid"],
      warnings: [],
    });
    const response = await POST(request({ action: "rollback" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ action: "rollback", document: null });
    expect(mocks.rollback).toHaveBeenCalledWith({ projectId: "project1", userId: "user1" });
  });

  it("explica los estados sin datos, sin copia o ya migrados", async () => {
    for (const [status, code] of [["already-migrated", 409], ["no-data", 404], ["no-backup", 409]] as const) {
      mocks.migrate.mockResolvedValueOnce({ status });
      mocks.rollback.mockResolvedValueOnce({ status });
      expect((await POST(request({ action: "migrate" }))).status).toBe(code);
    }
  });

  it("rechaza acciones desconocidas y peticiones sin origen", async () => {
    expect((await POST(request({ action: "otra" }))).status).toBe(400);
    const response = await POST(new Request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "migrate" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.migrate).not.toHaveBeenCalled();
  });

  it("devuelve el error legible de una migración inválida", async () => {
    mocks.migrate.mockResolvedValue({
      status: "invalid",
      message: "El documento actual no se puede leer.",
      warnings: ["aviso"],
    });
    const response = await POST(request({ action: "migrate" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: "El documento actual no se puede leer.",
      warnings: ["aviso"],
    });
  });
});
