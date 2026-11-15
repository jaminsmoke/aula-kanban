import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  ALL_SCOPES,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  registerClient,
  revokeToken,
  type Db,
} from "../oauth/service";
import { authenticateMcp, hasScope, scopeForTool } from "./auth";
import { createMcpToken } from "./tokens";

type StatementParam = string | number | bigint | Uint8Array | null;

class TestD1 implements Db {
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

  batch = async (statements: Array<{ run: () => Promise<unknown> }>) => {
    for (const statement of statements) await statement.run();
    return [];
  };
}

function testDatabase(): { db: Db; close: () => void } {
  const sqlite = new DatabaseSync(":memory:");
  const names = readdirSync(resolve("drizzle"))
    .filter((name) => /^003[123]_/.test(name))
    .sort();
  if (names.length < 3) throw new Error("Faltan las migraciones 0031/0032 de mcp_tokens o 0033 de OAuth");
  for (const name of names) sqlite.exec(readFileSync(resolve("drizzle", name), "utf8"));
  return { db: new TestD1(sqlite), close: () => sqlite.close() };
}

const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const expectedResource = "https://site.test/api/mcp";

async function oauthToken(db: Db, scope: string, resource: string): Promise<string> {
  const registered = await registerClient(db, {
    redirectUris: ["https://app.example.com/callback"],
    scope: ALL_SCOPES,
    clientName: "Prueba",
  });
  if (!registered.ok) throw new Error("El registro debería funcionar");
  const code = await createAuthorizationCode(db, {
    clientId: registered.client.clientId,
    user: { userId: "u1", email: "docente@example.com" },
    redirectUri: "https://app.example.com/callback",
    codeChallenge: challenge,
    scope,
    resource,
  });
  const exchanged = await exchangeAuthorizationCode(db, {
    code,
    clientId: registered.client.clientId,
    clientSecret: registered.clientSecret,
    codeVerifier: verifier,
    redirectUri: "https://app.example.com/callback",
  });
  if (!exchanged.ok) throw new Error("El canje debería funcionar");
  return exchanged.tokens.access_token;
}

describe("verificador unificado del MCP", () => {
  it("el token personal sigue dando la cuenta completa sin recorte de alcance", async () => {
    const { db, close } = testDatabase();
    try {
      const created = await createMcpToken(db, "u1", "docente@example.com", "Prueba");
      const principal = await authenticateMcp(db, created.token, expectedResource);
      expect(principal?.via).toBe("personal");
      expect(principal?.userId).toBe("u1");
      expect(principal?.scopes).toEqual(["mcp:read", "mcp:write"]);
      expect(principal && hasScope(principal.scopes, "mcp:read") && hasScope(principal.scopes, "mcp:write")).toBe(true);
    } finally {
      close();
    }
  });

  it("un token OAuth con mcp:read verifica con sus alcances y su recurso", async () => {
    const { db, close } = testDatabase();
    try {
      const token = await oauthToken(db, "mcp:read", expectedResource);
      const principal = await authenticateMcp(db, token, expectedResource);
      expect(principal?.via).toBe("oauth");
      expect(principal?.email).toBe("docente@example.com");
      expect(principal?.scopes).toEqual(["mcp:read"]);
      expect(scopeForTool("listar_proyectos")).toBe("mcp:read");
      expect(scopeForTool("crear_tarea")).toBe("mcp:write");
      expect(scopeForTool("herramienta_inventada")).toBeNull();
      expect(principal && hasScope(principal.scopes, scopeForTool("listar_proyectos")!)).toBe(true);
      expect(principal && hasScope(principal.scopes, scopeForTool("crear_tarea")!)).toBe(false);
    } finally {
      close();
    }
  });

  it("un token OAuth de otro recurso no autentica en este MCP", async () => {
    const { db, close } = testDatabase();
    try {
      const token = await oauthToken(db, ALL_SCOPES, "https://otro.example.com/api/mcp");
      expect(await authenticateMcp(db, token, expectedResource)).toBeNull();

      const slashy = await oauthToken(db, ALL_SCOPES, `${expectedResource}/`);
      expect(await authenticateMcp(db, slashy, expectedResource)).not.toBeNull();

      const unbound = await oauthToken(db, ALL_SCOPES, "");
      expect(await authenticateMcp(db, unbound, expectedResource)).not.toBeNull();
    } finally {
      close();
    }
  });

  it("un token OAuth revocado o caducado no autentica", async () => {
    const { db, close } = testDatabase();
    try {
      const revoked = await oauthToken(db, ALL_SCOPES, expectedResource);
      expect(await authenticateMcp(db, revoked, expectedResource)).not.toBeNull();
      await revokeToken(db, { token: revoked });
      expect(await authenticateMcp(db, revoked, expectedResource)).toBeNull();

      const expired = await oauthToken(db, ALL_SCOPES, expectedResource);
      await db.prepare(`UPDATE oauth_access_tokens SET expires_at = ? WHERE email = ?`).bind(1, "docente@example.com").run();
      expect(await authenticateMcp(db, expired, expectedResource)).toBeNull();
    } finally {
      close();
    }
  });

  it("un token con formato desconocido o secreto incorrecto no autentica", async () => {
    const { db, close } = testDatabase();
    try {
      expect(await authenticateMcp(db, "basura", expectedResource)).toBeNull();
      const created = await createMcpToken(db, "u1", "docente@example.com", "Prueba");
      expect(await authenticateMcp(db, `${created.token}x`, expectedResource)).toBeNull();
    } finally {
      close();
    }
  });
});
