import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { userId: string; email: string; displayName: string; fullName: null } | null,
  d1: null as never,
}));

vi.mock("../../db", () => ({ getDb: () => ({}), getD1: () => mocks.d1 }));
vi.mock("../../lib/server/auth", () => ({ getChatGPTUser: async () => mocks.user, chatGPTSignInPath: (returnTo: string) => `/signin-with-chatgpt?return_to=${returnTo}` }));

type StatementParam = string | number | bigint | Uint8Array | null;

const testD1 = {
  prepare: (sql: string) => ({
    bind: (...params: StatementParam[]) => ({
      first: async <T>(): Promise<T | null> =>
        (sqlite.prepare(sql).get(...params) as unknown as T | undefined) ?? null,
      all: async <T>(): Promise<{ results: T[] }> => ({
        results: sqlite.prepare(sql).all(...params) as T[],
      }),
      run: async (): Promise<{ meta?: { changes?: number } }> => {
        const info = sqlite.prepare(sql).run(...params);
        return { meta: { changes: Number(info.changes) } };
      },
    }),
  }),
  batch: async (statements: Array<{ run: () => Promise<unknown> }>) => {
    for (const statement of statements) await statement.run();
    return [];
  },
} as never;

const sqlite = new DatabaseSync(":memory:");
const migrationNames = readdirSync(resolve("drizzle"))
  .filter((name) => /^003[123]_/.test(name))
  .sort();
if (migrationNames.length < 3) throw new Error("Faltan las migraciones 0031/0032/0033");
for (const name of migrationNames) sqlite.exec(readFileSync(resolve("drizzle", name), "utf8"));
mocks.d1 = testD1;

beforeEach(() => {
  sqlite.exec("DELETE FROM oauth_access_tokens; DELETE FROM oauth_refresh_tokens; DELETE FROM oauth_authorization_codes; DELETE FROM oauth_clients;");
  mocks.user = { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null };
});

function formRequest(path: string, fields: Record<string, string>, extra: Record<string, string> = {}) {
  return new Request(`https://site.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...extra },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("rutas OAuth (Fase 1)", () => {
  it("bloquea el registro de clientes en producción mientras OAuth está en revisión", async () => {
    const { POST } = await import("./register/route");
    vi.stubEnv("NODE_ENV", "production");
    try {
      const response = await POST(new Request("https://site.test/oauth/register", { method: "POST", body: "{}" }));
      expect(response.status).toBe(503);
    } finally { vi.unstubAllEnvs(); }
  });
  it("register acepta JSON con redirect_uris y devuelve credenciales una vez", async () => {
    const { POST } = await import("./register/route");
    const response = await POST(new Request("https://site.test/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["http://127.0.0.1:9000/callback"], scope: "mcp:read", client_name: "Inspector" }),
    }));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { client_id: string; client_secret: string; grant_types: string[]; scope: string };
    expect(body.client_id).toBeTruthy();
    expect(body.client_secret).toBeTruthy();
    expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(body.scope).toBe("mcp:read");
  });

  it("register rechaza redirect_uris peligrosas con invalid_redirect_uri", async () => {
    const { POST } = await import("./register/route");
    const response = await POST(new Request("https://site.test/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["javascript:alert(1)"], scope: "mcp:read", client_name: "Malo" }),
    }));
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("invalid_redirect_uri");
  });

  it("token canjea un código con PKCE y rechaza el reuso con invalid_grant", async () => {
    const { POST: register } = await import("./register/route");
    const { POST: token } = await import("./token/route");
    const registrationResponse = await register(new Request("https://site.test/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["https://app.example.com/cb"], scope: "mcp:read mcp:write", client_name: "Inspector" }),
    }));
    const registration = (await registrationResponse.json()) as { client_id: string; client_secret: string };

    // Insertar el código directamente (el consentimiento lo cubre la página).
    // La página de consentimiento se prueba con la sesión real en el smoke.
    const { createAuthorizationCode } = await import("../../lib/server/oauth/service");
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    const code = await createAuthorizationCode(mocks.d1, {
      clientId: registration.client_id,
      user: { userId: "u1", email: "docente@example.com" },
      redirectUri: "https://app.example.com/cb",
      codeChallenge: challenge,
      scope: "mcp:read mcp:write",
    });

    const exchange = () => token(formRequest("/oauth/token", {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: registration.client_id,
      client_secret: registration.client_secret,
    }));

    const first = await exchange();
    expect(first.status).toBe(200);
    const tokens = (await first.json()) as { access_token: string; refresh_token: string };
    expect(tokens.access_token.startsWith("ak_oauth_")).toBe(true);

    const second = await exchange();
    expect(second.status).toBe(400);
    expect(((await second.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("consent rechaza sin sesión y deniega redirigiendo access_denied", async () => {
    const { POST: consent } = await import("./authorize/consent/route");
    mocks.user = null;
    const withoutSession = await consent(formRequest("/oauth/authorize/consent", { action: "approve" }, { origin: "https://site.test" }));
    expect(withoutSession.status).toBe(302);
    expect(withoutSession.headers.get("Location")).toContain("/signin-with-chatgpt");

    mocks.user = { userId: "u1", email: "docente@example.com", displayName: "Docente", fullName: null };
    const { POST: register } = await import("./register/route");
    const registrationResponse = await register(new Request("https://site.test/oauth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["https://app.example.com/cb"], scope: "mcp:read", client_name: "Inspector" }),
    }));
    const registration = (await registrationResponse.json()) as { client_id: string };

    const denied = await consent(formRequest("/oauth/authorize/consent", {
      action: "deny",
      client_id: registration.client_id,
      redirect_uri: "https://app.example.com/cb",
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      scope: "mcp:read",
      state: "xyz",
    }, { origin: "https://site.test" }));
    expect(denied.status).toBe(302);
    const location = denied.headers.get("Location") ?? "";
    expect(location).toContain("error=access_denied");
    expect(location).toContain("state=xyz");

    // Un POST de otro origen está bloqueado por la guarda del navegador.
    const crossOrigin = await consent(formRequest("/oauth/authorize/consent", { action: "approve" }, { origin: "https://evil.test" }));
    expect(crossOrigin.status).toBe(403);
  });
});
