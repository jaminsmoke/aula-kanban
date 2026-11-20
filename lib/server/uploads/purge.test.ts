import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: null as unknown as D1Database,
  bucket: null as unknown as { delete: ReturnType<typeof vi.fn> } | null,
}));

vi.mock("cloudflare:workers", () => ({
  env: {
    get DB() {
      return mocks.db;
    },
    get BUCKET() {
      return mocks.bucket;
    },
  },
}));

import { StorageUnavailableError } from "../storage";
import { purgeAllUnusedUploads, purgeUnusedUploads } from "./purge";

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
        all: async () => ({ results: sqlite.prepare(sql).all() }),
        bind(...params: Array<string | number | null>) {
          return {
            all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
            run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...params).changes } }),
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

/**
 * Indica si la fila de un archivo sigue en la base.
 * @param id - Identificador.
 * @returns `true` si existe.
 */
function exists(id: string): boolean {
  return Boolean(sqlite.prepare("SELECT 1 FROM uploads WHERE id = ?").get(id));
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE tasks (id TEXT, project_id TEXT, image_url TEXT);
    CREATE TABLE boards (project_id TEXT, snapshot TEXT);
    CREATE TABLE app_documents (project_id TEXT, state TEXT);
    CREATE TABLE document_copies (id TEXT, project_id TEXT);
    CREATE TABLE uploads (id TEXT, project_id TEXT, storage_key TEXT, url TEXT, mime_type TEXT, size_bytes INTEGER, purpose TEXT, created_at INTEGER);
  `);
  mocks.db = fakeD1();
  mocks.bucket = { delete: vi.fn(async () => undefined) };
});

describe("purga de archivos sin uso", () => {
  it("borra el huérfano y conserva el archivo referenciado", async () => {
    sqlite.prepare("INSERT INTO tasks VALUES ('t1', ?, '/api/files/aaaa')").run(projectId);
    upload("aaaa", 1);
    upload("bbbb", 2);

    const report = await purgeUnusedUploads({ projectId, now, simulate: false });
    expect(report).toMatchObject({ ok: true, candidates: 1, deleted: 1, skipped: 0, failed: 0, bytes: 10, aborted: false });
    expect(exists("aaaa")).toBe(true);
    expect(exists("bbbb")).toBe(false);
    expect(mocks.bucket?.delete).toHaveBeenCalledWith(`${projectId}/task-image/bbbb.png`);
    expect(mocks.bucket?.delete).toHaveBeenCalledTimes(1);
  });

  it("la simulación no toca R2 ni la base de datos", async () => {
    upload("bbbb", 1);
    const report = await purgeUnusedUploads({ projectId, now });
    expect(report).toMatchObject({ ok: true, simulated: true, candidates: 1, deleted: 0, bytes: 10 });
    expect(exists("bbbb")).toBe(true);
    expect(mocks.bucket?.delete).not.toHaveBeenCalled();
  });

  it("relee las referencias antes de borrar cada candidato", async () => {
    upload("uno", 1);
    upload("dos", 2);
    let first = true;
    mocks.bucket = {
      delete: vi.fn(async () => {
        if (!first) return;
        first = false;
        sqlite.prepare("INSERT INTO tasks VALUES ('t1', ?, '/api/files/dos')").run(projectId);
      }),
    };

    const report = await purgeUnusedUploads({ projectId, now, simulate: false });
    expect(report).toMatchObject({ deleted: 1, skipped: 1 });
    expect(exists("uno")).toBe(false);
    expect(exists("dos")).toBe(true);
  });

  it("conserva la fila si R2 falla y la borra en el siguiente intento", async () => {
    upload("uno", 1);
    const remove = mocks.bucket?.delete as ReturnType<typeof vi.fn>;
    remove.mockRejectedValueOnce(new Error("R2 no disponible"));

    expect(await purgeUnusedUploads({ projectId, now, simulate: false })).toMatchObject({ deleted: 0, failed: 1 });
    expect(exists("uno")).toBe(true);

    expect(await purgeUnusedUploads({ projectId, now, simulate: false })).toMatchObject({ deleted: 1, failed: 0 });
    expect(exists("uno")).toBe(false);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("falla cerrado si un documento del proyecto está corrupto", async () => {
    sqlite.prepare("INSERT INTO boards VALUES (?, '{corrupto')").run(projectId);
    upload("uno", 1);
    expect(await purgeUnusedUploads({ projectId, now, simulate: false })).toEqual({ ok: false, projectId, reason: "references_unreadable" });
    expect(exists("uno")).toBe(true);
    expect(mocks.bucket?.delete).not.toHaveBeenCalled();
  });

  it("no borra nada sin R2 y conserva los metadatos", async () => {
    upload("uno", 1);
    mocks.bucket = null;
    await expect(purgeUnusedUploads({ projectId, now, simulate: false })).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(exists("uno")).toBe(true);
  });

  it("purga todos los proyectos y suma los recuentos", async () => {
    upload("uno", 1);
    upload("dos", 2, otherProject);
    const run = await purgeAllUnusedUploads({ now, simulate: false });
    expect(run).toMatchObject({ simulated: false, projects: 2, candidates: 2, deleted: 2, failed: 0, bytes: 20, problems: [] });
    expect(exists("uno")).toBe(false);
    expect(exists("dos")).toBe(false);
  });

  it("purga también los archivos de un proyecto ya eliminado", async () => {
    upload("huerfano", 1, otherProject);
    const run = await purgeAllUnusedUploads({ now, simulate: false });
    expect(run).toMatchObject({ projects: 1, deleted: 1, failed: 0, problems: [] });
    expect(exists("huerfano")).toBe(false);
  });

  it("un proyecto con documentos corruptos no impide purgar los demás", async () => {
    sqlite.prepare("INSERT INTO app_documents VALUES (?, '{corrupto')").run(projectId);
    upload("uno", 1);
    upload("dos", 2, otherProject);

    const run = await purgeAllUnusedUploads({ now, simulate: false });
    expect(run).toMatchObject({ projects: 1, deleted: 1, problems: [{ projectId, reason: "references_unreadable" }] });
    expect(exists("uno")).toBe(true);
    expect(exists("dos")).toBe(false);
  });

  it("la simulación global informa de lo que se borraría", async () => {
    upload("uno", 1);
    const run = await purgeAllUnusedUploads({ now });
    expect(run).toMatchObject({ simulated: true, projects: 1, candidates: 1, deleted: 0, bytes: 10 });
    expect(exists("uno")).toBe(true);
    expect(mocks.bucket?.delete).not.toHaveBeenCalled();
  });
});
