import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

/**
 * Visibilidad de `listar_actividad_mcp`: la cuenta ve lo suyo y el propietario
 * o la administración ven toda la instancia. Se ejecuta contra SQLite real.
 */

const state = vi.hoisted(() => ({ d1: null as unknown }));

vi.mock("cloudflare:workers", () => ({ env: { DB: null } }));
vi.mock("../../../../db", () => ({ getD1: () => state.d1, getDb: () => ({}) }));
vi.mock("../../project-access", () => ({
  isOwner: async (user: { userId: string }) => user.userId === "u-owner",
  isAdministrator: async (user: { userId: string }) => user.userId === "u-admin",
  isOwnerContactEmail: async () => false,
}));

import { herramientasAdministracion } from "./administracion";
import type { McpCaller } from "../contexto";

type StatementParam = string | number | null;

class TestD1 {
  constructor(private sqlite: DatabaseSync) {}
  prepare = (sql: string) => ({
    bind: (...params: StatementParam[]) => ({
      all: async <T>(): Promise<{ results: T[] }> => ({ results: this.sqlite.prepare(sql).all(...params) as T[] }),
    }),
  });
}

function baseDatos(): { sqlite: DatabaseSync; close: () => void } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(resolve("drizzle/0034_mcp_audit_log.sql"), "utf8"));
  state.d1 = new TestD1(sqlite);
  return { sqlite, close: () => sqlite.close() };
}

function insertar(sqlite: DatabaseSync, id: string, userId: string, createdAt: number, herramienta = "listar_proyectos") {
  sqlite
    .prepare("INSERT INTO mcp_audit_log (id, user_id, via, client_id, tool_name, project_id, result_code, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, userId, "plugin", "cliente-1", herramienta, "p1", "ok", 12, createdAt);
}

const tool = herramientasAdministracion.find((item) => item.name === "listar_actividad_mcp")!;
const caller = (userId: string): McpCaller => ({ userId, email: `${userId}@example.com` });

async function actividad(userId: string, args: Record<string, unknown> = {}) {
  const result = await tool.handler(caller(userId), args);
  return result.structuredContent as { actividad: Array<Record<string, unknown>>; total: number; pagina: number; porPagina: number };
}

describe("visibilidad de la actividad MCP", () => {
  it("la cuenta normal solo ve sus filas", async () => {
    const { sqlite, close } = baseDatos();
    try {
      const now = Date.now();
      insertar(sqlite, "a", "u-teacher", now - 1000, "listar_tareas");
      insertar(sqlite, "b", "u-otro", now - 2000, "crear_tarea");
      const page = await actividad("u-teacher");
      expect(page.total).toBe(1);
      expect(page.actividad).toHaveLength(1);
      expect(page.actividad[0]).toMatchObject({ usuarioId: "u-teacher", herramienta: "listar_tareas", via: "plugin", clientId: "cliente-1", proyectoId: "p1", resultado: "ok", duracionMs: 12 });
      expect(page.actividad[0]).not.toHaveProperty("args");
    } finally {
      close();
    }
  });

  it("el propietario ve toda la instancia y puede filtrar", async () => {
    const { sqlite, close } = baseDatos();
    try {
      const now = Date.now();
      insertar(sqlite, "a", "u-teacher", now - 1000, "listar_tareas");
      insertar(sqlite, "b", "u-otro", now - 2000, "crear_tarea");
      const todos = await actividad("u-owner");
      expect(todos.total).toBe(2);
      const filtrado = await actividad("u-owner", { herramienta: "crear_tarea", pagina: 1, porPagina: 1 });
      expect(filtrado.total).toBe(1);
      expect(filtrado.actividad[0].usuarioId).toBe("u-otro");
    } finally {
      close();
    }
  });

  it("una fecha inválida devuelve el error de validación sin consultar", async () => {
    const { close } = baseDatos();
    try {
      const result = await tool.handler(caller("u-teacher"), { desde: "2026-02-30", hasta: "2026-02-01" });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({ error: { codigo: "invalid", mensaje: "El rango de fechas no es válido." } });
    } finally {
      close();
    }
  });
});
