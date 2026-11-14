import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  authenticateMcpToken,
  createMcpToken,
  hashSecret,
  listMcpTokens,
  parseToken,
  revokeMcpToken,
  type TokenDatabase,
} from "./tokens";

type StatementParam = string | number | bigint | Uint8Array | null;

/** Adaptador de D1 sobre SQLite en memoria (la misma SQL que aplica el Site). */
class TestD1 implements TokenDatabase {
  constructor(private sqlite: DatabaseSync) {}

  prepare = (sql: string) => ({
    bind: (...params: StatementParam[]) => ({
      first: async <T>(): Promise<T | null> =>
        (this.sqlite.prepare(sql).get(...params) as unknown as T | undefined) ?? null,
      all: async <T>(): Promise<{ results: T[] }> => ({
        results: this.sqlite.prepare(sql).all(...params) as T[],
      }),
      run: async (): Promise<{ meta?: { changes?: number } }> => {
        const info = this.sqlite.prepare(sql).run(...params);
        return { meta: { changes: Number(info.changes) } };
      },
    }),
  });
}

function testDatabase(): { d1: TokenDatabase; close: () => void } {
  const sqlite = new DatabaseSync(":memory:");
  const names = readdirSync(resolve("drizzle")).filter((name) => /^003[12]_/.test(name)).sort();
  if (names.length < 2) throw new Error("Faltan las migraciones 0031 y 0032 de mcp_tokens");
  for (const name of names) sqlite.exec(readFileSync(resolve("drizzle", name), "utf8"));
  return { d1: new TestD1(sqlite), close: () => sqlite.close() };
}

describe("tokens del MCP", () => {
  it("autentica el token recién creado con su cuenta", async () => {
    const { d1, close } = testDatabase();
    try {
      const created = await createMcpToken(d1, "u1", "docente@example.com", "Claude");
      expect(created.token.startsWith("ak_mcp_")).toBe(true);
      expect(created.label).toBe("Claude");
      const auth = await authenticateMcpToken(d1, created.token);
      expect(auth).toEqual({ userId: "u1", email: "docente@example.com", tokenId: created.id });
      expect((await listMcpTokens(d1, "u1"))[0].lastUsedAt).not.toBeNull();
    } finally {
      close();
    }
  });

  it("rechaza un secreto distinto, un token mal formado y uno revocado", async () => {
    const { d1, close } = testDatabase();
    try {
      const created = await createMcpToken(d1, "u1", "docente@example.com", "Claude");
      const wrongSecret = `${created.token.slice(0, created.token.lastIndexOf("_") + 1)}otro-secreto`;
      expect(await authenticateMcpToken(d1, wrongSecret)).toBeNull();
      expect(await authenticateMcpToken(d1, "sin-formato")).toBeNull();
      expect(await revokeMcpToken(d1, "u1", created.id)).toBe(true);
      expect(await authenticateMcpToken(d1, created.token)).toBeNull();
      expect(await revokeMcpToken(d1, "u1", created.id)).toBe(false);
    } finally {
      close();
    }
  });

  it("no permite revocar el token de otra cuenta y el listado no muestra secretos", async () => {
    const { d1, close } = testDatabase();
    try {
      const created = await createMcpToken(d1, "u1", "docente@example.com", "Claude");
      expect(await revokeMcpToken(d1, "u2", created.id)).toBe(false);
      const [meta] = await listMcpTokens(d1, "u1");
      expect(Object.keys(meta).sort()).toEqual(["createdAt", "id", "label", "lastUsedAt", "revokedAt"]);
      expect(meta.label).toBe("Claude");
      expect(await authenticateMcpToken(d1, created.token)).not.toBeNull();
    } finally {
      close();
    }
  });

  it("la hash es estable y cambia con la sal", async () => {
    const a = await hashSecret("sal", "secreto");
    expect(a).toBe(await hashSecret("sal", "secreto"));
    expect(a).not.toBe(await hashSecret("otra-sal", "secreto"));
    expect(a).not.toContain("secreto");
  });

  it("parseToken extrae id y secreto y rechaza otros formatos", () => {
    const { id, secret } = { id: "00000000-0000-4000-8000-000000000000", secret: "abc" };
    expect(parseToken(`ak_mcp_${id}_${secret}`)).toEqual({ id, secret });
    expect(parseToken("ak_mcp_sin-separador")).toBeNull();
    expect(parseToken("otro-prefijo")).toBeNull();
  });
});
