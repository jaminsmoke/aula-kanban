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

import { boardStats } from "./board-stats";

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
 * Inserta una pizarra.
 * @param id - Dueño de la pizarra.
 * @param snapshot - Snapshot serializado.
 */
function board(id: string, snapshot: string) {
  sqlite.prepare("INSERT INTO boards (project_id, owner_type, owner_id, snapshot, revision, updated_at) VALUES ('p', 'task', ?, ?, 1, 1)")
    .run(id, snapshot);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE boards (project_id TEXT, owner_type TEXT, owner_id TEXT, snapshot TEXT, revision INTEGER, updated_at INTEGER)");
  mocks.db = fakeD1();
});

describe("medición de snapshots", () => {
  it("suma tamaños, cuenta umbrales y revisa tumbas de las mayores", async () => {
    const small = JSON.stringify({ elements: [{ id: "a", isDeleted: true }, { id: "b" }] });
    const big = JSON.stringify({ elements: [], pad: "x".repeat(1_048_576) });
    board("pequena", small);
    board("ilegible", "no-json");
    board("grande", big);

    const stats = await boardStats();

    expect(stats.boards).toBe(3);
    expect(stats.maxChars).toBe(big.length);
    expect(stats.totalChars).toBe(small.length + "no-json".length + big.length);
    expect(stats.averageChars).toBe(Math.round(stats.totalChars / 3));
    expect(stats.over1mb).toBe(1);
    expect(stats.over1_5mb).toBe(0);
    expect(stats.largest[0]).toEqual({ ownerType: "task", ownerId: "grande", chars: big.length, elements: 0, deleted: 0 });
    expect(stats.largest).toContainEqual({ ownerType: "task", ownerId: "ilegible", chars: 7, elements: null, deleted: null });
    expect(stats.largest).toContainEqual({ ownerType: "task", ownerId: "pequena", chars: small.length, elements: 2, deleted: 1 });
  });

  it("devuelve ceros sin pizarras", async () => {
    await expect(boardStats()).resolves.toEqual({
      boards: 0, totalChars: 0, maxChars: 0, averageChars: 0, over1mb: 0, over1_5mb: 0, largest: [],
    });
  });
});
