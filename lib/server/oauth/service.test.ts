import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  ALL_SCOPES,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  getClient,
  isValidRedirectUri,
  normalizeScopes,
  registerClient,
  refreshAccessToken,
  revokeToken,
  verifyAccessToken,
  verifyPkceS256,
  type Db,
} from "./service";

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
const clientSecretBody = { redirectUris: ["https://app.example.com/callback"], scope: ALL_SCOPES, clientName: "Prueba" };

async function registeredClient(db: Db) {
  const registered = await registerClient(db, clientSecretBody);
  if (!registered.ok) throw new Error("El registro debería funcionar");
  return registered;
}

async function authorizeCode(db: Db, clientId: string, overrides: Partial<{ redirectUri: string; scope: string }> = {}) {
  return createAuthorizationCode(db, {
    clientId,
    user: { userId: "u1", email: "docente@example.com" },
    redirectUri: overrides.redirectUri ?? "https://app.example.com/callback",
    codeChallenge: challenge,
    scope: overrides.scope ?? ALL_SCOPES,
    resource: "https://site.example.com/api/mcp",
  });
}

describe("servidor de autorización OAuth", () => {
  it("rechaza códigos manipulados y acepta un solo canje simultáneo", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);
      const params = { clientId: registered.client.clientId, clientSecret: registered.clientSecret, codeVerifier: verifier };
      const bad = await exchangeAuthorizationCode(db, { ...params, code: `${code}X` });
      expect(bad.ok).toBe(false);
      const results = await Promise.all([exchangeAuthorizationCode(db, { ...params, code }), exchangeAuthorizationCode(db, { ...params, code })]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
    } finally { close(); }
  });

  it("permite una sola rotación simultánea del token de refresco", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);
      const params = { clientId: registered.client.clientId, clientSecret: registered.clientSecret };
      const exchanged = await exchangeAuthorizationCode(db, { ...params, code, codeVerifier: verifier });
      if (!exchanged.ok) throw new Error("El canje debería funcionar");
      const refreshToken = exchanged.tokens.refresh_token;
      const results = await Promise.all([refreshAccessToken(db, { ...params, refreshToken }), refreshAccessToken(db, { ...params, refreshToken })]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
    } finally { close(); }
  });
  it("registra un cliente con su secreto y valida las redirect_uris", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      expect(registered.client.redirectUris).toEqual(["https://app.example.com/callback"]);
      expect(registered.scopes).toBe(ALL_SCOPES);

      const evil = await registerClient(db, { redirectUris: ["javascript:alert(1)"], scope: "", clientName: "Malo" });
      expect(evil.ok).toBe(false);
      if (!evil.ok) expect(evil.error.error).toBe("invalid_redirect_uri");

      const userinfo = await registerClient(db, { redirectUris: ["https://user:pass@example.com/"], scope: "", clientName: "Malo" });
      expect(userinfo.ok).toBe(false);
      if (!userinfo.ok) expect(userinfo.error.error).toBe("invalid_redirect_uri");
    } finally {
      close();
    }
  });

  it("verifica PKCE S256 y valida URIs de redirección", async () => {
    expect(await verifyPkceS256(verifier, challenge)).toBe(true);
    expect(await verifyPkceS256("otro-verificador", challenge)).toBe(false);
    expect(isValidRedirectUri("https://app.example.com/cb")).toBe(true);
    expect(isValidRedirectUri("http://127.0.0.1:8080/cb")).toBe(true);
    expect(isValidRedirectUri("http://localhost/cb")).toBe(true);
    expect(isValidRedirectUri("http://app.example.com/cb")).toBe(false);
    expect(isValidRedirectUri("https://app.example.com/cb#frag")).toBe(false);
  });

  it("canjea un código por el par de tokens y comprueba su secreto en claro", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);
      const exchanged = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: verifier,
      });
      expect(exchanged.ok).toBe(true);
      if (exchanged.ok) {
        expect(exchanged.tokens.access_token.startsWith("ak_oauth_")).toBe(true);
        expect(exchanged.tokens.refresh_token.startsWith("ak_oauth_")).toBe(true);
        expect(exchanged.tokens.expires_in).toBeGreaterThan(0);
      }

      // El mismo código no se puede reutilizar: es de un solo uso.
      const again = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: verifier,
      });
      expect(again.ok).toBe(false);
      if (!again.ok) expect(again.error.error).toBe("invalid_grant");
    } finally {
      close();
    }
  });

  it("rechaza el canje con secreto equivocado, PKCE frío o redirect distinta", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);

      const badSecret = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: "secreto-equivocado",
        codeVerifier: verifier,
      });
      expect(badSecret.ok).toBe(false);
      if (!badSecret.ok) expect(badSecret.error.error).toBe("invalid_client");

      const badPkce = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: "verificador-equivocado",
      });
      expect(badPkce.ok).toBe(false);
      if (!badPkce.ok) expect(badPkce.error.error).toBe("invalid_grant");

      const badRedirect = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: verifier,
        redirectUri: "https://app.example.com/otra",
      });
      expect(badRedirect.ok).toBe(false);
      if (!badRedirect.ok) expect(badRedirect.error.error).toBe("invalid_grant");
    } finally {
      close();
    }
  });

  it("rota el refresco, revoca el anterior y no amplía el alcance", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);
      const exchanged = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: verifier,
      });
      if (!exchanged.ok) throw new Error("El canje debería funcionar");

      const scope = normalizeScopes("mcp:read");
      const readOnly = await refreshAccessToken(db, {
        refreshToken: exchanged.tokens.refresh_token,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        scope,
      });
      expect(readOnly.ok).toBe(true);
      if (readOnly.ok) {
        expect(readOnly.tokens.scope).toBe("mcp:read");
        const verified = await verifyAccessToken(db, readOnly.tokens.access_token);
        expect(verified?.scope).toBe("mcp:read");
      }

      // El refresco anterior ya se revocó con la rotación.
      const reuse = await refreshAccessToken(db, {
        refreshToken: exchanged.tokens.refresh_token,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
      });
      expect(reuse.ok).toBe(false);
      if (!reuse.ok) expect(reuse.error.error).toBe("invalid_grant");
    } finally {
      close();
    }
  });

  it("un token revocado deja de verificar", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const code = await authorizeCode(db, registered.client.clientId);
      const exchanged = await exchangeAuthorizationCode(db, {
        code,
        clientId: registered.client.clientId,
        clientSecret: registered.clientSecret,
        codeVerifier: verifier,
      });
      if (!exchanged.ok) throw new Error("El canje debería funcionar");
      const verified = await verifyAccessToken(db, exchanged.tokens.access_token);
      expect(verified?.userId).toBe("u1");
      expect(verified?.resource).toBe("https://site.example.com/api/mcp");

      await revokeToken(db, { token: exchanged.tokens.access_token, clientId: registered.client.clientId, clientSecret: registered.clientSecret });
      expect(await verifyAccessToken(db, exchanged.tokens.access_token)).toBeNull();
    } finally {
      close();
    }
  });

  it("getClient devuelve el cliente registrado", async () => {
    const { db, close } = testDatabase();
    try {
      const registered = await registeredClient(db);
      const found = await getClient(db, registered.client.clientId);
      expect(found?.clientName).toBe("Prueba");
      expect(await getClient(db, "inexistente")).toBeNull();
    } finally {
      close();
    }
  });
});
