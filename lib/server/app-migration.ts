import { getD1 } from "../../db";

/**
 * Traslada la instalación heredada en un lote atómico y repetible.
 * @param db - Binding D1 de la instancia.
 */
export async function migrateLegacyAppInstall(db: D1Database = getD1()) {
  const exists = await db.prepare("SELECT 1 AS found FROM instance_apps WHERE app_id = 'edu-tools' LIMIT 1").first();
  if (!exists) return;
  await db.batch([
    ...["calculadora", "tabla-periodica"].map((id) => db.prepare(`INSERT OR IGNORE INTO instance_apps (id, app_id, installed, version, installed_by_user_id, updated_at) SELECT ? || '-' || id, ?, 1, version, installed_by_user_id, updated_at FROM instance_apps WHERE app_id = 'edu-tools' AND installed = 1`).bind(id, id)),
    db.prepare("DELETE FROM instance_apps WHERE app_id = 'edu-tools'"),
  ]);
}

/**
 * Traslada solo las preferencias de la cuenta y proyecto solicitados.
 * @param projectId - Proyecto de las preferencias.
 * @param userId - Cuenta propietaria de las preferencias.
 * @param db - Binding D1 de la instancia.
 */
export async function migrateLegacyAppPreferences(projectId: string, userId: string, db: D1Database = getD1()) {
  const exists = await db.prepare("SELECT 1 AS found FROM app_preferences WHERE project_id = ? AND user_id = ? AND app_id = 'edu-tools' LIMIT 1").bind(projectId, userId).first();
  if (!exists) return;
  await db.batch([
    ...["calculadora", "tabla-periodica"].map((id) => db.prepare(`INSERT OR IGNORE INTO app_preferences (project_id, user_id, app_id, favorite, position, updated_at) SELECT project_id, user_id, ?, favorite, position, updated_at FROM app_preferences WHERE project_id = ? AND user_id = ? AND app_id = 'edu-tools'`).bind(id, projectId, userId)),
    db.prepare("DELETE FROM app_preferences WHERE project_id = ? AND user_id = ? AND app_id = 'edu-tools'").bind(projectId, userId),
  ]);
}
