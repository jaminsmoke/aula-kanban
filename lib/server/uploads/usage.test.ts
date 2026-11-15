import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown as D1Database }));

vi.mock("cloudflare:workers", () => ({
  env: {
    get DB() {
      return mocks.db;
    },
  },
}));

import { UPLOAD_BATCH_LIMIT_MAX, UPLOAD_GRACE_MS, findUnusedUploads } from "./usage";

const projectId = "11111111-1111-4111-8111-111111111111";
const otherProject = "33333333-3333-4333-8333-333333333333";
const now = 10_000_000_000;
let sqlite: DatabaseSync;

/**
 * Crea un D1 mínimo sobre SQLite en memoria.
 * @returns El binding simulado.
 */
function fakeD1(): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...params: Array<string | number | null>) {
          return {
            all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
          };
        },
      };
    },
  } as unknown as D1Database;
}

/**
 * Inserta una fila de archivo.
 * @param id - Identificador.
 * @param createdAt - Fecha de creación.
 * @param project - Proyecto de la fila.
 */
function upload(id: string, createdAt: number, project = projectId) {
  sqlite.prepare("INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, created_at) VALUES (?, ?, ?, ?, 'image/png', 10, 'task-image', ?)")
    .run(id, project, `${project}/task-image/${id}.png`, `/api/files/${id}`, createdAt);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE tasks (id TEXT, project_id TEXT, image_url TEXT);
    CREATE TABLE boards (project_id TEXT, snapshot TEXT);
    CREATE TABLE app_documents (project_id TEXT, state TEXT);
    CREATE TABLE uploads (id TEXT, project_id TEXT, storage_key TEXT, url TEXT, mime_type TEXT, size_bytes INTEGER, purpose TEXT, created_at INTEGER);
  `);
  mocks.db = fakeD1();
});

describe("inventario de archivos sin uso", () => {
  it("protege los archivos referenciados por tareas, pizarras y documentos", async () => {
    sqlite.prepare("INSERT INTO tasks VALUES ('t1', ?, '/api/files/aaaa')").run(projectId);
    sqlite.prepare("INSERT INTO boards VALUES (?, ?)").run(projectId, JSON.stringify({ files: { f1: { dataURL: "/api/files/bbbb" } } }));
    sqlite.prepare("INSERT INTO app_documents VALUES (?, ?)").run(projectId, JSON.stringify({ code: "imagen /api/files/cccc" }));
    upload("aaaa", 1);
    upload("bbbb", 2);
    upload("cccc", 3);

    const report = await findUnusedUploads({ projectId, now });
    expect(report).toMatchObject({ ok: true, references: 3, candidates: [], hasMore: false });
  });

  it("devuelve solo los huérfanos fuera del periodo de gracia", async () => {
    upload("antiguo", now - UPLOAD_GRACE_MS - 1);
    upload("reciente", now - UPLOAD_GRACE_MS + 1);
    sqlite.prepare("INSERT INTO tasks VALUES ('t1', ?, '/api/files/referenciado')").run(projectId);
    upload("referenciado", now - UPLOAD_GRACE_MS - 1000);

    const report = await findUnusedUploads({ projectId, now });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.candidates.map((candidate) => candidate.id)).toEqual(["antiguo"]);
    expect(report.candidates[0]).toMatchObject({
      url: "/api/files/antiguo",
      storageKey: `${projectId}/task-image/antiguo.png`,
      purpose: "task-image",
      sizeBytes: 10,
    });
    expect(report.hasMore).toBe(false);
  });

  it("falla cerrado si una pizarra o un documento no se puede interpretar", async () => {
    sqlite.prepare("INSERT INTO boards VALUES (?, ?)").run(projectId, "{corrupto");
    upload("antiguo", 1);
    expect(await findUnusedUploads({ projectId, now })).toEqual({ ok: false, projectId, reason: "references_unreadable" });

    sqlite.exec("DELETE FROM boards");
    sqlite.prepare("INSERT INTO app_documents VALUES (?, ?)").run(projectId, "{corrupto");
    expect(await findUnusedUploads({ projectId, now })).toEqual({ ok: false, projectId, reason: "references_unreadable" });
  });

  it("acota el lote y avisa de que quedan más candidatos", async () => {
    upload("uno", 1);
    upload("dos", 2);
    upload("tres", 3);

    const report = await findUnusedUploads({ projectId, now, limit: 2 });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.candidates.map((candidate) => candidate.id)).toEqual(["uno", "dos"]);
    expect(report.hasMore).toBe(true);
    expect((await findUnusedUploads({ projectId, now, limit: UPLOAD_BATCH_LIMIT_MAX + 50 })).ok).toBe(true);
  });

  it("no mezcla proyectos ni protege con referencias ajenas", async () => {
    upload("propio", 1);
    upload("ajeno", 2, otherProject);
    sqlite.prepare("INSERT INTO tasks VALUES ('t1', ?, '/api/files/propio')").run(otherProject);

    const report = await findUnusedUploads({ projectId, now });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.references).toBe(0);
    expect(report.candidates.map((candidate) => candidate.id)).toEqual(["propio"]);
  });

  it("trata un snapshot vacío como documento sin referencias", async () => {
    sqlite.prepare("INSERT INTO boards VALUES (?, '')").run(projectId);
    upload("antiguo", 1);
    const report = await findUnusedUploads({ projectId, now });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.candidates.map((candidate) => candidate.id)).toEqual(["antiguo"]);
  });
});
