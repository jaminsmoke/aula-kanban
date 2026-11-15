import { lt } from "drizzle-orm";
import { getD1, getDb } from "../../../db";
import { mcpAuditLog } from "../../../db/schema";

/**
 * Registro de auditoría de las llamadas MCP.
 *
 * Sin argumentos ni contenidos: solo fecha, cuenta, vía
 * (`plugin` | `personal` | `oauth`), `clientId`, herramienta, proyecto,
 * código de resultado y duración. Retención de 90 días con purga al
 * registrar, como las bajas de 30 días (`deleted-profiles`). La consulta
 * vive en Ajustes con MCP-09.
 */

/** Retención del registro: 90 días. */
export const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let lastPurge = 0;

/** Vía por la que llega la llamada. */
export type AuditVia = "plugin" | "personal" | "oauth";

/** Una entrada del registro de auditoría. */
export type AuditEntry = {
  userId: string;
  via: AuditVia;
  clientId: string | null;
  herramienta: string;
  proyectoId: string | null;
  resultado: string;
  duracionMs: number;
};

/**
 * Purga las entradas con más de 90 días, como mucho una vez por hora.
 * @returns Promesa que se resuelve cuando termina la purga.
 */
export async function purgeAuditLog() {
  const now = Date.now();
  if (now - lastPurge < CHECK_INTERVAL_MS) return;
  lastPurge = now;
  try {
    await getDb().delete(mcpAuditLog).where(lt(mcpAuditLog.createdAt, now - AUDIT_RETENTION_MS));
  } catch {
    /* sin tabla o sin base: la próxima llamada lo reintenta */
  }
}

/** Fila de `mcp_audit_log` expuesta por la consulta. */
export type AuditRow = {
  user_id: string;
  via: string;
  client_id: string | null;
  tool_name: string;
  project_id: string | null;
  result_code: string;
  duration_ms: number;
  created_at: number;
};

/** Filtros de la consulta de auditoría. */
export type AuditQuery = {
  userId?: string;
  via?: AuditVia;
  herramienta?: string;
  resultado?: string;
  proyectoId?: string;
  desde?: number;
  hasta?: number;
  pagina: number;
  porPagina: number;
};

/**
 * Consulta la auditoría con retención, filtros y paginación.
 * La consulta solo selecciona metadatos: nunca argumentos ni contenidos.
 * @param filtros - Cuenta, vía, herramienta, resultado, proyecto, fechas y página.
 * @returns Las filas de la página y el total que cumple los filtros.
 */
export async function consultarAuditoria(filtros: AuditQuery): Promise<{ filas: AuditRow[]; total: number }> {
  const condiciones = ["created_at >= ?"];
  const params: Array<string | number> = [Date.now() - AUDIT_RETENTION_MS];
  if (filtros.userId !== undefined) {
    condiciones.push("user_id = ?");
    params.push(filtros.userId);
  }
  if (filtros.via !== undefined) {
    condiciones.push("via = ?");
    params.push(filtros.via);
  }
  if (filtros.herramienta !== undefined) {
    condiciones.push("tool_name = ?");
    params.push(filtros.herramienta);
  }
  if (filtros.resultado !== undefined) {
    condiciones.push("result_code = ?");
    params.push(filtros.resultado);
  }
  if (filtros.proyectoId !== undefined) {
    condiciones.push("project_id = ?");
    params.push(filtros.proyectoId);
  }
  if (filtros.desde !== undefined) {
    condiciones.push("created_at >= ?");
    params.push(filtros.desde);
  }
  if (filtros.hasta !== undefined) {
    condiciones.push("created_at <= ?");
    params.push(filtros.hasta);
  }
  const where = condiciones.join(" AND ");
  const db = getD1();
  const [filas, total] = await Promise.all([
    db
      .prepare(
        `SELECT user_id, via, client_id, tool_name, project_id, result_code, duration_ms, created_at FROM mcp_audit_log WHERE ${where} ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, filtros.porPagina, (filtros.pagina - 1) * filtros.porPagina)
      .all<AuditRow>(),
    db.prepare(`SELECT COUNT(*) AS total FROM mcp_audit_log WHERE ${where}`).bind(...params).all<{ total: number }>(),
  ]);
  return { filas: filas.results, total: Number(total.results[0]?.total ?? 0) };
}

/**
 * Guarda una llamada del MCP. Nunca interrumpe la herramienta: si falta la
 * tabla o la base, la entrada se pierde sin efecto en la respuesta.
 * @param entry - Datos de la llamada ya resueltos (sin argumentos).
 * @returns Promesa que se resuelve cuando termina el insert.
 */
export async function registrarAuditoria(entry: AuditEntry) {
  try {
    await getDb().insert(mcpAuditLog).values({
      id: crypto.randomUUID(),
      userId: entry.userId,
      via: entry.via,
      clientId: entry.clientId,
      toolName: entry.herramienta,
      projectId: entry.proyectoId,
      resultCode: entry.resultado,
      durationMs: entry.duracionMs,
      createdAt: Date.now(),
    });
  } catch {
    /* best-effort: la auditoría nunca rompe la llamada */
  }
  await purgeAuditLog();
}
