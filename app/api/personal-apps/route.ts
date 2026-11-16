import { isDemoUser } from "../../../lib/domain/demo";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";
import {
  PersonalAppsError,
  describePersonalApps,
  listPersonalApps,
  parsePersonalItems,
  setPersonalApps,
} from "../../../lib/server/personal-apps";

export const dynamic = "force-dynamic";

/**
 * Lee el espacio personal de la cuenta en el proyecto activo: sus
 * herramientas disponibles (instaladas en la instancia) con favorito y
 * orden personales, ya ordenadas para su presentación.
 *
 * Es una capa de organización: nunca instala ni concede permisos, y
 * nunca lista apps no instaladas. Requiere la membresía activa en el
 * proyecto, como el resto de rutas de proyecto.
 */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    const apps = await listPersonalApps(project.id, project.access.user.userId);
    return json({ role: project.access.role, apps: describePersonalApps(apps) });
  } catch {
    return json({ message: "No se pudieron consultar tus herramientas." }, 502);
  }
});

/**
 * Guarda la selección personal completa de la cuenta en el proyecto
 * activo (favoritos y orden). Solo acepta apps instaladas: una selección
 * personal nunca reinstala una app desinstalada globalmente.
 */
export const PUT = withJsonMutation(
  withProjectRoute(async (request, project) => {
    if (isDemoUser(project.access.user)) return json({ message: "La demo es de solo lectura." }, 403);
    let items;
    try {
      items = parsePersonalItems(await request.json().catch(() => null));
    } catch (error) {
      if (error instanceof PersonalAppsError) return json({ message: error.message }, error.status);
      throw error;
    }
    try {
      const apps = await setPersonalApps(project.id, project.access.user.userId, items);
      return json({ role: project.access.role, apps: describePersonalApps(apps) });
    } catch (error) {
      if (error instanceof PersonalAppsError) return json({ message: error.message }, error.status);
      return json({ message: "No se pudieron guardar tus herramientas." }, 502);
    }
  }),
);
