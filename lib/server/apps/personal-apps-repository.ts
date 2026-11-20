import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { appPreferences } from "../../../db/schema";

/**
 * Acceso D1 a las preferencias personales de apps por usuario y proyecto.
 *
 * La validación, el orden y el cruce con la instalación viven en
 * `personal-apps.ts`; este módulo solo lee, sustituye e inserta filas.
 */

/** Fila de `app_preferences`. */
export type AppPreferenceRow = typeof appPreferences.$inferSelect;

/**
 * Lista las preferencias de una cuenta en un proyecto por posición.
 * @param projectId - Proyecto activo.
 * @param userId - Cuenta dueña de las preferencias.
 * @returns Las filas de `app_preferences`.
 */
export async function listAppPreferenceRows(projectId: string, userId: string): Promise<AppPreferenceRow[]> {
  return getDb()
    .select()
    .from(appPreferences)
    .where(and(eq(appPreferences.projectId, projectId), eq(appPreferences.userId, userId)))
    .orderBy(asc(appPreferences.position));
}

/**
 * Borra las preferencias de las apps enviadas en la selección.
 * @param projectId - Proyecto activo.
 * @param userId - Cuenta dueña de las preferencias.
 * @param appIds - Apps que se sustituyen.
 */
export async function deleteAppPreferenceRows(projectId: string, userId: string, appIds: readonly string[]): Promise<void> {
  if (appIds.length === 0) return;
  await getDb()
    .delete(appPreferences)
    .where(and(
      eq(appPreferences.projectId, projectId),
      eq(appPreferences.userId, userId),
      inArray(appPreferences.appId, [...appIds]),
    ));
}

/**
 * Inserta la selección personal ya normalizada.
 * @param values - Filas completas de `app_preferences`.
 */
export async function insertAppPreferenceRows(values: Array<typeof appPreferences.$inferInsert>): Promise<void> {
  if (values.length === 0) return;
  await getDb().insert(appPreferences).values(values);
}
