import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import type { ChatGPTUser } from "./auth";

/**
 * Integración SQLite de la baja compartida de administradores: se ejecuta el
 * DELETE real sobre una tabla con la misma forma que `administrators_unified`,
 * incluida la revisión, y se comprueba que no borra con una revisión vieja.
 * La lectura de la ficha se simula con el resultado de la tabla para aislar
 * esta prueba del adaptador Drizzle de Cloudflare.
 */

type Ficha = { id: string; email: string | null; userId: string | null; displayName: string; revision: number; mutationToken: string | null; createdAt: number };
const state = vi.hoisted(() => ({ env: { DB: null as unknown }, rows: [] as Ficha[] }));

vi.mock("cloudflare:workers", () => ({ env: state.env }));
vi.mock("../../../db", () => ({
  getDb: () => ({
    select: () => {
      const promise = Promise.resolve(state.rows) as Promise<Ficha[]> & { where: () => unknown };
      promise.where = () => promise;
      return { from: () => promise };
    },
  }),
}));
vi.mock("../projects/project-access", () => ({
  isOwner: async (user: ChatGPTUser) => user.userId === "u-owner",
  isAdministrator: async (user: ChatGPTUser) => user.userId === "u-admin",
  isOwnerContactEmail: async () => false,
}));

import { eliminarAdministrador } from "./administradores";

type StatementParam = string | number | null;

class TestD1 {
  constructor(private sqlite: DatabaseSync) {}
  prepare = (sql: string) => ({
    bind: (...params: StatementParam[]) => ({
      all: async <T>(): Promise<{ results: T[] }> => ({ results: this.sqlite.prepare(sql).all(...params) as T[] }),
    }),
  });
}

const id = "99999999-9999-4999-8999-999999999999";
const owner: ChatGPTUser = { userId: "u-owner", email: "owner@example.com", displayName: "Owner", fullName: null };
const admin: ChatGPTUser = { userId: "u-admin", email: "admin@example.com", displayName: "Admin", fullName: null };
const ficha = (revision = 1): Ficha => ({ id, email: "admin@example.com", userId: "u-admin", displayName: "Admin", revision, mutationToken: null, createdAt: 1 });

function baseDatos(): { sqlite: DatabaseSync; close: () => void } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE administrators_unified (
      id text PRIMARY KEY NOT NULL,
      email text,
      user_id text,
      display_name text DEFAULT '' NOT NULL,
      revision integer DEFAULT 1 NOT NULL,
      mutation_token text,
      created_at integer NOT NULL
    );
    CREATE UNIQUE INDEX unified_administrator_email ON administrators_unified (email);
    CREATE UNIQUE INDEX unified_administrator_user_id ON administrators_unified (user_id);
  `);
  sqlite.prepare("INSERT INTO administrators_unified (id, email, user_id, display_name, revision, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, "admin@example.com", "u-admin", "Admin", 1, 1);
  state.env.DB = new TestD1(sqlite);
  return { sqlite, close: () => sqlite.close() };
}

describe("baja compartida de administradores sobre SQLite", () => {
  it("borra la ficha con la revisión correcta", async () => {
    const { sqlite, close } = baseDatos();
    try {
      state.rows = [ficha()];
      const result = await eliminarAdministrador(admin, { id, revision: 1 });
      expect(result).toEqual({ ok: true, valor: { id } });
      expect(sqlite.prepare("SELECT COUNT(*) AS total FROM administrators_unified").get()).toEqual({ total: 0 });
    } finally {
      close();
    }
  });

  it("no borra con una revisión vieja y devuelve conflicto", async () => {
    const { sqlite, close } = baseDatos();
    try {
      sqlite.prepare("UPDATE administrators_unified SET revision = 2 WHERE id = ?").run(id);
      state.rows = [ficha(2)];
      const result = await eliminarAdministrador(owner, { id, revision: 1 });
      expect(result).toMatchObject({ ok: false, status: 409 });
      expect(sqlite.prepare("SELECT revision FROM administrators_unified WHERE id = ?").get(id)).toEqual({ revision: 2 });
    } finally {
      close();
    }
  });

  it("rechaza a quien no es propietario ni administrador antes de tocar SQLite", async () => {
    const { close } = baseDatos();
    try {
      const result = await eliminarAdministrador({ ...owner, userId: "u-teacher" }, { id, revision: 1 });
      expect(result).toMatchObject({ ok: false, status: 403 });
    } finally {
      close();
    }
  });
});
