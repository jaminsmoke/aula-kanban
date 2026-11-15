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

import { uploadStats } from "./stats";

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
 * Inserta una subida con su origen y tamaño.
 * @param id - Identificador.
 * @param origin - Origen, o `null` para filas anteriores.
 * @param purpose - Finalidad declarada.
 * @param sizeBytes - Tamaño en bytes.
 */
function upload(id: string, origin: string | null, purpose: string, sizeBytes: number) {
  sqlite.prepare("INSERT INTO uploads (id, project_id, storage_key, url, mime_type, size_bytes, purpose, origin, created_at) VALUES (?, 'p', 'k', 'u', 'image/png', ?, ?, ?, 1)")
    .run(id, sizeBytes, purpose, origin);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE uploads (id TEXT, project_id TEXT, storage_key TEXT, url TEXT, mime_type TEXT, size_bytes INTEGER, purpose TEXT, origin TEXT, created_at INTEGER)");
  mocks.db = fakeD1();
});

describe("medición de subidas", () => {
  it("agrupa por origen y finalidad, y cuenta los umbrales de tamaño", async () => {
    upload("a", "web", "task-image", 40_000);
    upload("b", "mcp", "task-image", 1_200_000);
    upload("c", "mcp", "board-asset", 2_400_000);
    upload("d", "mcp", "board-asset", 300_000);
    upload("e", null, "document", 10);

    const stats = await uploadStats();

    expect(stats.total).toBe(5);
    expect(stats.rows).toEqual([
      { origin: "mcp", purpose: "board-asset", count: 2, bytes: 2_700_000, maxBytes: 2_400_000, over1mb: 1, over2mb: 1 },
      { origin: "mcp", purpose: "task-image", count: 1, bytes: 1_200_000, maxBytes: 1_200_000, over1mb: 1, over2mb: 0 },
      { origin: "unknown", purpose: "document", count: 1, bytes: 10, maxBytes: 10, over1mb: 0, over2mb: 0 },
      { origin: "web", purpose: "task-image", count: 1, bytes: 40_000, maxBytes: 40_000, over1mb: 0, over2mb: 0 },
    ]);
  });

  it("devuelve un resultado vacío sin subidas", async () => {
    await expect(uploadStats()).resolves.toEqual({ total: 0, rows: [] });
  });
});
