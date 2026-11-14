import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { validProject } from "../../../lib/server/project";
import { boundedJson } from "../../../lib/server/bounded-json";
import { NATIVE_APP_IDS } from "../../../lib/native-apps";
import { readAppDocument, saveAppDocument } from "../../../lib/server/app-documents";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_STATE = 200_000;
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

/**
 * Lee el documento guardado de una app en el proyecto activo.
 * @param request - Petición con `project` y `app`.
 * @returns El estado guardado o `null` si la app aún no tiene documento.
 */
export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  const appId = appFrom(request);
  if (!appId) return json({ message: "Aplicación no válida." }, 400);
  try {
    const document = await readAppDocument(project.id, appId);
    return json({ state: document?.state ?? null, updatedAt: document?.updatedAt ?? null });
  } catch {
    return json({ message: "No se pudo leer el documento guardado." }, 502);
  }
}

/**
 * Guarda el documento de una app para el proyecto. Sirve a cualquier app
 * nativa: el estado es JSON y la app decide su forma.
 * @param request - Petición con `project`, `app` y `state`.
 * @returns Confirmación con la fecha de guardado.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return json({ message: "Solicitud no válida." }, 403);
  }
  const user = await getChatGPTUser();
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  if (project.access.role === "guest") return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  const appId = appFrom(request);
  if (!appId) return json({ message: "Aplicación no válida." }, 400);

  let body: unknown;
  try { body = await boundedJson(request, MAX_STATE); } catch { return json({ message: "Documento no válido o demasiado grande." }, 413); }
  const parsed = z.object({ state: z.unknown() }).strict().safeParse(body);
  if (!parsed.success || parsed.data.state === undefined) return json({ message: "Documento no válido." }, 400);

  const serialized = JSON.stringify(parsed.data.state);
  if (serialized.length > MAX_STATE) return json({ message: "El documento es demasiado grande." }, 413);

  try {
    const updatedAt = await saveAppDocument({
      projectId: project.id,
      appId,
      state: serialized,
      updatedByUserId: user?.userId ?? null,
    });
    return json({ accepted: true, updatedAt });
  } catch {
    return json({ message: "No se pudo guardar el documento." }, 502);
  }
}
