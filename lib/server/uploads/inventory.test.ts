import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: null as unknown as D1Database,
  bucket: null as unknown as { list: ReturnType<typeof vi.fn> } | null,
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
import { auditInventoryPage } from "./inventory";

const proyecto = "11111111-1111-4111-8111-111111111111";
const uploaded = new Date("2026-11-15T10:00:00.000Z");
let sqlite: DatabaseSync;

/**
 * Crea un D1 mínimo sobre SQLite en memoria.
 * @returns El binding simulado.
 */
function fakeD1(): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...params: Array<string | number>) {
          return {
            all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
          };
        },
      };
    },
  } as unknown as D1Database;
}

/**
 * Construye un objeto tal como lo devuelve R2.
 * @param key - Clave del objeto.
 * @returns El objeto simulado.
 */
function object(key: string) {
  return { key, size: 12, uploaded, etag: "etag-1" };
}

/**
 * Inserta una fila de `uploads`.
 * @param id - Identificador.
 * @param storageKey - Clave exacta del objeto.
 */
function upload(id: string, storageKey: string) {
  sqlite.prepare("INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, created_at) VALUES (?, ?, ?, ?, 'image/png', 12, 'task-image', 1)")
    .run(id, proyecto, storageKey, `/api/files/${id}`);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE uploads (id TEXT, project_id TEXT, storage_key TEXT, url TEXT, mime_type TEXT, size_bytes INTEGER, purpose TEXT, created_at INTEGER);
  `);
  mocks.db = fakeD1();
  mocks.bucket = { list: vi.fn(async () => ({ objects: [], truncated: false })) };
});

describe("cotejo del inventario por página", () => {
  it("clasifica objetos con fila, huérfanos y claves a revisar", async () => {
    const conFila = `${proyecto}/task-image/aaaa.png`;
    const huerfano = `${proyecto}/board-asset/bbbb.png`;
    upload("aaaa", conFila);
    mocks.bucket = {
      list: vi.fn(async () => ({ objects: [object(conFila), object(huerfano), object("default/original")], truncated: true, cursor: "c2" })),
    };

    const report = await auditInventoryPage({ limit: 10 });
    expect(report.counts).toEqual({ objects: 3, withRow: 1, orphanObjects: 1, missingObjects: 0, reviewKeys: 1 });
    expect(report.entries.map((entry) => entry.status)).toEqual(["con_fila", "objeto_sin_fila", "clave_revisar"]);
    expect(report.truncated).toBe(true);
    expect(JSON.parse(decodeURIComponent(report.cursor!))).toEqual(["c2", "default/original"]);
    expect(report.range).toEqual({ from: conFila, to: "default/original" });
    expect(mocks.bucket.list).toHaveBeenCalledWith({ limit: 10 });
  });

  it("detecta una fila dentro del rango de la página sin objeto", async () => {
    const uno = `${proyecto}/task-image/aaaa.png`;
    const ausente = `${proyecto}/task-image/bbbb.png`;
    const dos = `${proyecto}/task-image/cccc.png`;
    upload("aaaa", uno);
    upload("bbbb", ausente);
    mocks.bucket = {
      list: vi.fn(async () => ({ objects: [object(uno), object(dos)], truncated: true, cursor: "c2" })),
    };

    const report = await auditInventoryPage();
    expect(report.counts).toEqual({ objects: 2, withRow: 1, orphanObjects: 1, missingObjects: 1, reviewKeys: 0 });
    expect(report.entries.at(-1)).toMatchObject({ status: "fila_sin_objeto", id: "bbbb", storageKey: ausente });
  });

  it("en la última página revisa las filas que quedan por encima del último objeto", async () => {
    const uno = `${proyecto}/task-image/aaaa.png`;
    const sobrante = `${proyecto}/task-image/zzzz.png`;
    upload("aaaa", uno);
    upload("zzzz", sobrante);
    mocks.bucket = {
      list: vi.fn(async () => ({ objects: [object(uno)], truncated: false, cursor: "ignorado" })),
    };

    const report = await auditInventoryPage();
    expect(report.counts).toEqual({ objects: 1, withRow: 1, orphanObjects: 0, missingObjects: 1, reviewKeys: 0 });
    expect(report.cursor).toBeNull();
    expect(report.entries.at(-1)).toMatchObject({ status: "fila_sin_objeto", storageKey: sobrante });
  });

  it("con el bucket vacío marca todas las filas como sin objeto", async () => {
    upload("aaaa", `${proyecto}/task-image/aaaa.png`);
    upload("bbbb", `${proyecto}/document/bbbb.pdf`);

    const report = await auditInventoryPage();
    expect(report.counts).toEqual({ objects: 0, withRow: 0, orphanObjects: 0, missingObjects: 2, reviewKeys: 0 });
    expect(report.range).toBeNull();
    expect(report.entries.every((entry) => entry.status === "fila_sin_objeto")).toBe(true);
  });

  it("pasa el cursor y no revisa las filas posteriores si hay más páginas", async () => {
    const uno = `${proyecto}/task-image/aaaa.png`;
    upload("zzzz", `${proyecto}/task-image/zzzz.png`);
    mocks.bucket = {
      list: vi.fn(async () => ({ objects: [object(uno)], truncated: true, cursor: "c2" })),
    };

    const report = await auditInventoryPage({ cursor: encodeURIComponent(JSON.stringify(["c1", "000"])), limit: 500 });
    expect(mocks.bucket.list).toHaveBeenCalledWith({ limit: 100, cursor: "c1" });
    expect(report.counts).toEqual({ objects: 1, withRow: 0, orphanObjects: 1, missingObjects: 0, reviewKeys: 0 });
  });

  it("detecta filas anteriores al primer objeto y entre páginas", async () => {
    upload("antes", "a"); upload("hueco", "c"); upload("despues", "z");
    mocks.bucket = { list: vi.fn(async (args: { cursor?: string }) => args.cursor
      ? { objects: [object("d")], truncated: false }
      : { objects: [object("b")], truncated: true, cursor: "next" }) };
    const primera = await auditInventoryPage();
    const segunda = await auditInventoryPage({ cursor: primera.cursor! });
    expect([...primera.entries, ...segunda.entries].filter(e => e.status === "fila_sin_objeto").map(e => e.storageKey)).toEqual(["a", "c", "z"]);
  });

  it("falla con storage no disponible si no hay binding", async () => {
    mocks.bucket = null;
    await expect(auditInventoryPage()).rejects.toBeInstanceOf(StorageUnavailableError);
  });
});
