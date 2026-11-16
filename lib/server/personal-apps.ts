import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { appPreferences } from "../../db/schema";
import { NATIVE_APP_IDS, nativeAppMeta, type NativeAppId } from "../native-apps";
import { listInstalledApps } from "./apps";

/**
 * Espacio personal de la mochila del alumnado y el maletín docente
 * (APP-03). Es una capa de organización sobre las apps instaladas:
 * favoritos y orden de presentación por usuario y proyecto activo.
 * Nunca instala ni desinstala; la instalación sigue siendo de
 * instancia, y la autoriza el dueño o un administrador
 * y la autoriza el dueño o un administrador (`POST /api/space-apps`).
 *
 * La ausencia de fila en `app_preferences` equivale a «no favorita» y
 * sin posición, con el orden del catálogo como defecto. Los favoritos de
 * apps no instaladas se conservan pero no se listan mientras la app no
 * esté instalada; al perder la membresía activa el usuario deja de
 * poder leer o escribir sus preferencias de ese proyecto (el servidor
 * exige la membresía, como en el resto de rutas).
 */

/** Preferencia personal de una app: puede ser favorita y tener posición. */
export type PersonalAppPreference = {
  id: NativeAppId;
  favorite: boolean;
  /** Posición en la presentación personal; `null` = orden del catálogo. */
  position: number | null;
};

/** Une la preferencia con el estado de instalación de la app. */
export type PersonalAppItem = PersonalAppPreference & { installed: boolean };

/** Error tipado para responder con el código HTTP que le corresponde. */
export class PersonalAppsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const isAppId = (id: unknown): id is NativeAppId =>
  typeof id === "string" && (NATIVE_APP_IDS as readonly string[]).includes(id);

/**
 * Mergea las preferencias guardadas con el estado de instalación.
 * @param installed - Ids de apps instaladas en la instancia.
 * @param stored - Preferencias persistidas del usuario en el proyecto.
 * @returns Una entrada por app del catálogo, con su preferencia aplicada.
 */
export function applyPreferences(
  installed: ReadonlySet<string>,
  stored: readonly PersonalAppPreference[],
): PersonalAppItem[] {
  const byId = new Map(stored.map((item) => [item.id, item]));
  return NATIVE_APP_IDS.map((id) => {
    const preference = byId.get(id);
    return {
      id,
      favorite: preference?.favorite ?? false,
      position: preference?.position ?? null,
      installed: installed.has(id),
    };
  });
}

/**
 * Ordena las herramientas disponibles: primero las favoritas y luego el
 * resto; dentro de cada grupo, por posición personal y en último lugar
 * por el orden del catálogo.
 * @param items - Herramientas disponibles (instaladas) con su preferencia.
 * @returns Las herramientas en el orden de presentación personal.
 */
export function orderPersonalApps(items: readonly PersonalAppItem[]): PersonalAppItem[] {
  const catalogIndex = new Map(NATIVE_APP_IDS.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    const positionA = a.position ?? Number.MAX_SAFE_INTEGER;
    const positionB = b.position ?? Number.MAX_SAFE_INTEGER;
    if (positionA !== positionB) return positionA - positionB;
    return (catalogIndex.get(a.id) ?? 0) - (catalogIndex.get(b.id) ?? 0);
  });
}

/**
 * Lee el espacio personal de un usuario en un proyecto.
 * @param projectId - Proyecto activo.
 * @param userId - Cuenta que pide su organización personal.
 * @returns Solo las apps instaladas, con su favorito y posición, ordenadas.
 */
export async function listPersonalApps(projectId: string, userId: string): Promise<PersonalAppItem[]> {
  const db = getDb();
  const [installedState, stored] = await Promise.all([
    listInstalledApps(),
    db
      .select()
      .from(appPreferences)
      .where(and(eq(appPreferences.projectId, projectId), eq(appPreferences.userId, userId)))
      .orderBy(asc(appPreferences.position)),
  ]);
  const installed = new Set(installedState.filter((item) => item.status === "installed").map((item) => item.id));
  const preferences: PersonalAppPreference[] = [];
  for (const row of stored) {
    if (isAppId(row.appId)) {
      preferences.push({ id: row.appId, favorite: row.favorite === 1, position: row.position });
    }
  }
  return orderPersonalApps(applyPreferences(installed, preferences).filter((item) => item.installed));
}

/**
 * Valida el cuerpo de `PUT /api/personal-apps`.
 * @param body - Cuerpo JSON recibido.
 * @returns La selección completa y validada.
 */
export function parsePersonalItems(body: unknown): PersonalAppPreference[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    throw new PersonalAppsError("Revisa la selección de herramientas.", 400);
  }
  const seen = new Set<string>();
  return (body as { items: unknown[] }).items.map((raw) => {
    if (!raw || typeof raw !== "object") throw new PersonalAppsError("Revisa la selección de herramientas.", 400);
    const { id, favorite, position } = raw as { id?: unknown; favorite?: unknown; position?: unknown };
    if (!isAppId(id)) throw new PersonalAppsError("Aplicación no válida.", 400);
    if (typeof favorite !== "boolean") throw new PersonalAppsError("Revisa la selección de herramientas.", 400);
    if ((position !== null && position !== undefined) && (!Number.isInteger(position) || (position as number) < 0)) {
      throw new PersonalAppsError("Revisa la posición de las herramientas.", 400);
    }
    if (seen.has(id)) throw new PersonalAppsError("Hay aplicaciones repetidas en la selección.", 400);
    seen.add(id);
    return { id, favorite, position: (position as number | null) ?? null };
  });
}

/**
 * Sustituye la selección personal de un usuario en un proyecto (idempotente).
 * Solo acepta apps instaladas: una selección personal nunca reinstala una
 * app desinstalada globalmente.
 * @param projectId - Proyecto activo.
 * @param userId - Cuenta que guarda su organización personal.
 * @param items - Selección completa y validada.
 * @returns La selección guardada, ordenada para su presentación.
 */
export async function setPersonalApps(projectId: string, userId: string, items: readonly PersonalAppPreference[]): Promise<PersonalAppItem[]> {
  const installedState = await listInstalledApps();
  const installed = new Set(installedState.filter((item) => item.status === "installed").map((item) => item.id));
  if (items.some((item) => !installed.has(item.id))) {
    throw new PersonalAppsError("Solo puedes guardar herramientas instaladas en la instancia.", 400);
  }
  const db = getDb();
  const now = Date.now();
  // Solo se sustituyen las filas de las apps enviadas: las preferencias de
  // apps desinstaladas (que la interfaz no envía) se conservan y vuelven a
  // ser visibles si la app se reinstala.
  if (items.length > 0) {
    await db
      .delete(appPreferences)
      .where(and(
        eq(appPreferences.projectId, projectId),
        eq(appPreferences.userId, userId),
        inArray(appPreferences.appId, items.map((item) => item.id)),
      ));
  }
  if (items.length > 0) {
    await db.insert(appPreferences).values(
      items.map((item) => ({
        projectId,
        userId,
        appId: item.id,
        favorite: item.favorite ? 1 : 0,
        position: item.position,
        updatedAt: now,
      })),
    );
  }
  return listPersonalApps(projectId, userId);
}

/**
 * Ficha breve de cada herramienta disponible, para la interfaz personal.
 * @param items - Herramientas ordenadas con su preferencia.
 * @returns Las mismas entradas con nombre, etiqueta y categoría del catálogo.
 */
export function describePersonalApps(items: readonly PersonalAppItem[]) {
  return items.map((item) => ({
    ...item,
    name: nativeAppMeta(item.id)?.name ?? item.id,
    tagline: nativeAppMeta(item.id)?.tagline ?? "",
    category: nativeAppMeta(item.id)?.category ?? "Aula",
  }));
}
