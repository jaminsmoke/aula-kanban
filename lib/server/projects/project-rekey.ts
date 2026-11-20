/**
 * Traslado puntual y transaccional del proyecto heredado de cada instancia.
 * Las rutas de objetos R2 permanecen intactas; solo cambia la referencia en D1.
 */
const LEGACY_ID = "default";

/**
 * Devuelve el UUID ya asignado a un identificador heredado, si existe.
 * @param db - Base D1 de la instancia.
 * @param oldId - Identificador anterior.
 * @returns El nuevo identificador o null.
 */
export async function canonicalProjectId(db: D1Database, oldId: string): Promise<string | null> {
  const row = await db.prepare("SELECT new_id FROM project_rekeys WHERE old_id = ? AND completed = 1").bind(oldId).first<{ new_id: string }>();
  return row?.new_id ?? null;
}

/**
 * Traslada el proyecto heredado en un único batch atómico. Solo debe llamarlo
 * el flujo de inicialización del propietario después de verificar su identidad.
 * @param db - Base D1 de la instancia.
 * @returns El UUID resultante o null si no existe proyecto heredado.
 */
export async function ensureLegacyProjectUuid(db: D1Database): Promise<string | null> {
  const existing = await canonicalProjectId(db, LEGACY_ID);
  if (existing) return existing;
  const legacy = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(LEGACY_ID).first<{ id: string }>();
  if (!legacy) return null;
  const nextId = crypto.randomUUID();
  const statement = (sql: string, ...args: string[]) => db.prepare(sql).bind(...args);
  const moves = ["students", "teachers", "tasks", "project_members", "task_assignees", "app_documents", "deleted_students", "deleted_teachers", "uploads", "mcp_audit_log"];
  try {
    await db.batch([
      statement("INSERT INTO projects (id, name, created_at) SELECT ?, name, created_at FROM projects WHERE id = ?", nextId, LEGACY_ID),
      statement("INSERT INTO project_rekeys (old_id, new_id, completed) VALUES (?, ?, 0)", LEGACY_ID, nextId),
      ...moves.map((table) => statement(`UPDATE ${table} SET project_id = ? WHERE project_id = ?`, nextId, LEGACY_ID)),
      statement("UPDATE boards SET project_id = ?, owner_id = CASE WHEN owner_type IN ('project', 'space') AND owner_id = ? THEN ? ELSE owner_id END WHERE project_id = ?", nextId, LEGACY_ID, nextId, LEGACY_ID),
      statement("DELETE FROM projects WHERE id = ?", LEGACY_ID),
      statement("UPDATE project_rekeys SET completed = 1 WHERE old_id = ? AND new_id = ?", LEGACY_ID, nextId),
    ]);
  } catch (error) {
    // Otra petición puede haber completado el mismo traslado primero.
    const completed = await canonicalProjectId(db, LEGACY_ID);
    if (completed) return completed;
    throw error;
  }
  return nextId;
}
