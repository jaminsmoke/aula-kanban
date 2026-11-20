import { describe, expect, it, vi } from "vitest";
import { clientStorageKey, createLocalState, type ClientStorage } from "./client-storage";

type TestState = { code: string };

function parseState(value: unknown): TestState | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as { code?: unknown };
  return typeof candidate.code === "string" ? { code: candidate.code } : null;
}

function createState(storage: ClientStorage | null, version = 2) {
  return createLocalState<TestState>({
    key: "aula-kanban:test:state",
    version,
    validate: parseState,
    fallback: () => ({ code: "fallback" }),
    storage,
  });
}

function memoryStorage(initial: Record<string, string> = {}): ClientStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

function envelope(version: number, data: unknown): string {
  return JSON.stringify({ __aulaClientStorage: 1, version, data });
}

describe("contrato de almacenamiento local", () => {
  it("escribe una envoltura versionada y la vuelve a leer", () => {
    const storage = memoryStorage();
    const state = createState(storage);

    expect(state.write({ code: "nuevo" })).toEqual({ ok: true });
    expect(storage.getItem(state.key)).toContain("__aulaClientStorage");
    expect(state.read()).toEqual({ code: "nuevo" });
    expect(state.readResult()).toMatchObject({ status: "ok", migrated: false });
  });

  it("usa el fallback si la clave no existe", () => {
    expect(createState(memoryStorage()).readResult()).toEqual({
      value: { code: "fallback" },
      status: "missing",
      migrated: false,
    });
  });

  it("usa el fallback si el JSON está corrupto", () => {
    const storage = memoryStorage({ "aula-kanban:test:state": "{ roto" });
    expect(createState(storage).readResult()).toMatchObject({
      value: { code: "fallback" },
      status: "invalid",
    });
  });

  it("migra un valor antiguo sin envoltura", () => {
    const storage = memoryStorage({
      "aula-kanban:test:state": JSON.stringify({ code: "antiguo" }),
    });

    expect(createState(storage).readResult()).toEqual({
      value: { code: "antiguo" },
      status: "ok",
      migrated: true,
    });
  });

  it("migra una envoltura de una versión anterior", () => {
    const storage = memoryStorage({
      "aula-kanban:test:state": envelope(1, { code: "antiguo" }),
    });
    const state = createLocalState<TestState>({
      key: "aula-kanban:test:state",
      version: 2,
      validate: parseState,
      migrate: (value, fromVersion) => {
        const previous = parseState(value);
        return previous ? { code: `${previous.code}:v${fromVersion}` } : null;
      },
      fallback: () => ({ code: "fallback" }),
      storage,
    });

    expect(state.readResult()).toEqual({
      value: { code: "antiguo:v1" },
      status: "ok",
      migrated: true,
    });
  });

  it("no interpreta una versión futura como válida", () => {
    const storage = memoryStorage({
      "aula-kanban:test:state": envelope(99, { code: "futuro" }),
    });

    expect(createState(storage).readResult()).toMatchObject({
      value: { code: "fallback" },
      status: "future",
      migrated: false,
    });
  });

  it("rechaza un valor que no pasa la validación", () => {
    const storage = memoryStorage({
      "aula-kanban:test:state": envelope(2, { code: 42 }),
    });

    expect(createState(storage).readResult()).toMatchObject({
      value: { code: "fallback" },
      status: "invalid",
    });
  });

  it("informa de cuota agotada sin lanzar", () => {
    const storage = memoryStorage();
    vi.mocked(storage.setItem).mockImplementation(() => {
      const error = new Error("sin espacio");
      error.name = "QuotaExceededError";
      throw error;
    });

    expect(createState(storage).write({ code: "nuevo" })).toEqual({
      ok: false,
      reason: "quota",
    });
  });

  it("funciona sin almacenamiento, como en SSR", () => {
    const state = createState(null);
    expect(state.readResult()).toMatchObject({ value: { code: "fallback" }, status: "unavailable" });
    expect(state.write({ code: "nuevo" })).toEqual({ ok: false, reason: "unavailable" });
    expect(state.remove()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("elimina la clave y codifica el espacio de nombres", () => {
    const storage = memoryStorage({ "aula-kanban:tarjetas:p%201": "{}" });
    const key = clientStorageKey("tarjetas", "p 1");
    expect(key).toBe("aula-kanban:tarjetas:p%201");

    const state = createLocalState<TestState>({
      key,
      version: 1,
      validate: parseState,
      fallback: () => ({ code: "fallback" }),
      storage,
    });
    expect(state.remove()).toEqual({ ok: true });
    expect(storage.getItem(key)).toBeNull();
  });
});
