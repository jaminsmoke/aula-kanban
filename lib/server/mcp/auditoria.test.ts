import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

/**
 * Consulta de auditoría sobre SQLite real: retención de 90 días, filtros,
 * orden y paginación. La tabla no tiene columnas de argumentos ni contenidos.
 */

const state = vi.hoisted(() => ({ d1: null as unknown }));

vi.mock("../../../db", () => ({ getD1: () => state.d1, getDb: () => ({}) }));

import { AUDIT_RETENTION_MS, consultarAuditoria } from "./auditoria";

type StatementParam = string | number | null;

/** Adaptador mínimo de D1 sobre SQLite en memoria. */
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

function insertar(sqlite: DatabaseSync, id: string, userId: string, createdAt: number, extra: { via?: string; herramienta?: string; resultado?: string; proyectoId?: string | null } = {}) {
  sqlite
    .prepare("INSERT INTO mcp_audit_log (id, user_id, via, client_id, tool_name, project_id, result_code, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, userId, extra.via ?? "plugin", "c1", extra.herramienta ?? "listar_proyectos", extra.proyectoId ?? null, extra.resultado ?? "ok", 12, createdAt);
}

describe("consulta de auditoría", () => {
  it("respeta la retención de 90 días y ordena de más reciente a más antiguo", async () => {
    const { sqlite, close } = baseDatos();
    try {
      const now = Date.now();
      insertar(sqlite, "vieja", "u1", now - AUDIT_RETENTION_MS - 1);
      insertar(sqlite, "a", "u1", now - 1000);
      insertar(sqlite, "b", "u2", now - 2000);
      const page = await consultarAuditoria({ pagina: 1, porPagina: 10 });
      expect(page.total).toBe(2);
      expect(page.filas.map((fila) => fila.created_at)).toEqual([now - 1000, now - 2000]);
      expect(page.filas[0]).not.toHaveProperty("args");
      expect(page.filas[0]).not.toHaveProperty("contenido");
    } finally {
      close();
    }
  });

  it("combina filtros de cuenta, vía, herramienta, resultado, proyecto y fechas", async () => {
    const { sqlite, close } = baseDatos();
    try {
      const now = Date.now();
      insertar(sqlite, "a", "u1", now - 1000, { via: "plugin", herramienta: "listar_tareas", resultado: "ok", proyectoId: "p1" });
      insertar(sqlite, "b", "u1", now - 2000, { via: "personal", herramienta: "listar_tareas", resultado: "ok", proyectoId: "p1" });
      insertar(sqlite, "c", "u2", now - 3000, { via: "plugin", herramienta: "crear_tarea", resultado: "forbidden", proyectoId: "p2" });
      const page = await consultarAuditoria({
        userId: "u1",
        via: "plugin",
        herramienta: "listar_tareas",
        resultado: "ok",
        proyectoId: "p1",
        desde: now - 1500,
        hasta: now,
        pagina: 1,
        porPagina: 10,
      });
      expect(page.total).toBe(1);
      expect(page.filas[0].user_id).toBe("u1");
      expect(page.filas[0].via).toBe("plugin");
    } finally {
      close();
    }
  });

  it("pagina y calcula el total de todos los filtros", async () => {
    const { sqlite, close } = baseDatos();
    try {
      const now = Date.now();
      insertar(sqlite, "a", "u1", now - 1000);
      insertar(sqlite, "b", "u1", now - 2000);
      insertar(sqlite, "c", "u1", now - 3000);
      const primera = await consultarAuditoria({ userId: "u1", pagina: 1, porPagina: 2 });
      const segunda = await consultarAuditoria({ userId: "u1", pagina: 2, porPagina: 2 });
      expect(primera.total).toBe(3);
      expect(primera.filas).toHaveLength(2);
      expect(segunda.filas).toHaveLength(1);
      expect(segunda.filas[0].created_at).toBe(now - 3000);
    } finally {
      close();
    }
  });
});
