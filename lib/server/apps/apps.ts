import { migrateLegacyAppInstall } from "./app-migration";
import { getDb } from "../../../db";
import { instanceApps } from "../../../db/schema";
import { NATIVE_APP_IDS, nativeAppMeta, type NativeAppId } from "../../native-apps";

/**
 * Estado de instalación de las apps nativas en la instancia.
 *
 * Extrae la lógica de `app/api/space-apps/route.ts` para que la ruta HTTP y
 * las herramientas MCP llamen a la misma función con la misma cuenta
 * (MCP-03). La instalación es de la instancia: una app instalada sirve a
 * todos los proyectos.
 */

/** Estado de una app: instalada o no, con la versión de integración guardada. */
export type AppInstalledState = {
  id: NativeAppId;
  status: "installed" | "not_installed";
  /** `appVersion` del catálogo al instalar, o `null` si aún no figura como instalada. */
  version: string | null;
};

/**
 * Lee el estado de las aplicaciones nativas instaladas en la instancia.
 * @returns Una entrada por aplicación del catálogo.
 */
export async function listInstalledApps(): Promise<AppInstalledState[]> {
  await migrateLegacyAppInstall();
  const rows = await getDb().select().from(instanceApps);
  return NATIVE_APP_IDS.map((id) => {
    const row = rows.find((item) => item.appId === id);
    return { id, status: row?.installed ? "installed" : "not_installed", version: row?.version ?? null } as AppInstalledState;
  });
}

/**
 * Instala o desinstala una aplicación en la instancia (idempotente).
 * Al instalar guarda la `appVersion` del catálogo, no `null`, para poder
 * mostrar «instalada x.y.z, disponible x.y.z».
 * @param userId - Cuenta que ejecuta la acción (solo propietario/administrador la llamarán).
 * @param appId - Identificador de la app del catálogo.
 * @param installed - `true` para instalar, `false` para desinstalar.
 * @returns El nuevo estado de la app.
 */
export async function setAppInstalled(userId: string, appId: NativeAppId, installed: boolean): Promise<AppInstalledState> {
  await migrateLegacyAppInstall();
  const status = installed ? "installed" : "not_installed";
  const version = installed ? (nativeAppMeta(appId)?.appVersion ?? null) : null;
  const now = Date.now();
  const values = { id: crypto.randomUUID(), appId, installed: installed ? 1 : 0, version, installedByUserId: userId, updatedAt: now };
  await getDb().insert(instanceApps).values(values).onConflictDoUpdate({
    target: instanceApps.appId,
    set: { installed: installed ? 1 : 0, version, installedByUserId: userId, updatedAt: now },
  });
  return { id: appId, status, version };
}

/** Mensaje de la ruta HTTP cuando la cuenta no puede gestionar aplicaciones. */
export const MANAGE_APPS_FORBIDDEN = "Solo el propietario o un administrador pueden gestionar aplicaciones.";
