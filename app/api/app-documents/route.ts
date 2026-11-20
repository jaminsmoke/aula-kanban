import { z } from "zod";
import { boundedJson } from "../../../lib/server/bounded-json";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";
import { MAX_APP_DOCUMENT_CHARS, readAppDocument, saveAppDocument, saveAppDocumentIfCurrent } from "../../../lib/server/apps/app-documents";
import { json } from "../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";
const nativeApp = z.enum(NATIVE_APP_IDS);

/**
 * Lee la app de la URL.
 * @param request - Petición con el parámetro `app`.
 * @returns El id validado o `null` si no es una app nativa.
 */
function appFrom(request: Request): string | null {
  const parsed = nativeApp.safeParse(new URL(request.url).searchParams.get("app"));
  return parsed.success ? parsed.data : null;
}

/** Lee el documento guardado de una app en el proyecto activo. */
export const GET = withProjectRoute(async (request, project) => {
  const appId = appFrom(request);
  if (!appId) return json({ message: "Aplicación no válida." }, 400);
  try {
    const document = await readAppDocument(project.id, appId);
    return json({ state: document?.state ?? null, updatedAt: document?.updatedAt ?? null });
  } catch {
    return json({ message: "No se pudo leer el documento guardado." }, 502);
  }
});

/**
 * Guarda el documento de una app para el proyecto. Sirve a cualquier app
 * nativa: el estado es JSON y la app decide su forma. Si llega
 * `expectedUpdatedAt`, el guardado solo se aplica cuando esa versión sigue
 * vigente; en caso contrario responde 409 sin pisar el documento.
 */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  const appId = appFrom(request);
  if (!appId) return json({ message: "Aplicación no válida." }, 400);

  let body: unknown;
  try { body = await boundedJson(request, MAX_APP_DOCUMENT_CHARS); } catch { return json({ message: "Documento no válido o demasiado grande." }, 413); }
  const parsed = z.object({
    state: z.unknown(),
    expectedUpdatedAt: z.number().int().nonnegative().nullable().optional(),
  }).strict().safeParse(body);
  if (!parsed.success || parsed.data.state === undefined) return json({ message: "Documento no válido." }, 400);

  const serialized = JSON.stringify(parsed.data.state);
  if (serialized.length > MAX_APP_DOCUMENT_CHARS) return json({ message: "El documento es demasiado grande." }, 413);

  try {
    if (parsed.data.expectedUpdatedAt !== undefined) {
      const result = await saveAppDocumentIfCurrent({
        projectId: project.id,
        appId,
        state: serialized,
        updatedByUserId: project.access.user.userId,
        expectedUpdatedAt: parsed.data.expectedUpdatedAt,
      });
      if (result.status === "conflict") {
        return json({
          accepted: false,
          conflict: true,
          message: "El documento ha cambiado en otra sesión.",
          updatedAt: result.updatedAt,
        }, 409);
      }
      return json({ accepted: true, updatedAt: result.updatedAt });
    }

    const updatedAt = await saveAppDocument({
      projectId: project.id,
      appId,
      state: serialized,
      updatedByUserId: project.access.user.userId,
    });
    return json({ accepted: true, updatedAt });
  } catch {
    return json({ message: "No se pudo guardar el documento." }, 502);
  }
}));
