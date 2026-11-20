import { getDb } from "../../../db";
import { instanceApps } from "../../../db/schema";
import type { NativeAppId } from "../../native-apps";

/**
 * Acceso D1 al estado de instalación de las apps de la instancia.
 *
 * La migración legacy, el catálogo y los mensajes viven en `apps.ts`; este
 * módulo solo lee y escribe `instance_apps`.
 */

/** Fila de `instance_apps`. */
export type InstanceAppRow = typeof instanceApps.$inferSelect;

/** Datos de instalación que se guardan por app. */
export type InstanceAppWrite = {
  id: string;
  appId: NativeAppId;
  installed: number;
  version: string | null;
  installedByUserId: string;
  updatedAt: number;
};

/**
 * Lista las filas de apps de la instancia.
 * @returns Las filas de `instance_apps`.
 */
export async function listInstanceAppRows(): Promise<InstanceAppRow[]> {
  return getDb().select().from(instanceApps);
}

/**
 * Instala o desinstala una app de forma idempotente.
 * @param values - Estado completo que se guarda.
 */
export async function upsertInstanceAppRow(values: InstanceAppWrite): Promise<void> {
  await getDb().insert(instanceApps).values(values).onConflictDoUpdate({
    target: instanceApps.appId,
    set: {
      installed: values.installed,
      version: values.version,
      installedByUserId: values.installedByUserId,
      updatedAt: values.updatedAt,
    },
  });
}
