import { eq } from "drizzle-orm";
import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { blocklyPrograms } from "../../../db/schema";
import { validProject } from "../../../lib/server/project";
import { boundedJson } from "../../../lib/server/bounded-json";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_STATE = 200_000;

/**
 * Lee el programa de Blockly guardado del proyecto.
 * @param request - Petición con el proyecto activo.
 * @returns Estado del lienzo o `null` si no hay programa guardado.
 */
export async function GET(request: Request) {
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  try {
    const [row] = await getDb().select().from(blocklyPrograms).where(eq(blocklyPrograms.projectId, project.id));
    if (!row) return json({ state: null });
    return json({ state: JSON.parse(row.state) as unknown, updatedAt: row.updatedAt });
  } catch {
    return json({ message: "No se pudo leer el programa guardado." }, 502);
  }
}

/**
 * Guarda el programa de Blockly del proyecto para miembros con permiso de edición.
 * @param request - Petición con el proyecto y el estado serializado.
 * @returns Confirmación de guardado.
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

  let body: unknown;
  try { body = await boundedJson(request, MAX_STATE); } catch { return json({ message: "Programa no válido o demasiado grande." }, 413); }
  const parsed = z.object({ state: z.record(z.string(), z.unknown()) }).strict().safeParse(body);
  if (!parsed.success) return json({ message: "Programa no válido." }, 400);

  const serialized = JSON.stringify(parsed.data.state);
  if (serialized.length > MAX_STATE) return json({ message: "El programa es demasiado grande." }, 413);

  const now = Date.now();
  try {
    await getDb().insert(blocklyPrograms).values({
      projectId: project.id,
      state: serialized,
      updatedAt: now,
      updatedByUserId: user?.userId ?? null,
    }).onConflictDoUpdate({
      target: blocklyPrograms.projectId,
      set: { state: serialized, updatedAt: now, updatedByUserId: user?.userId ?? null },
    });
    return json({ accepted: true, updatedAt: now });
  } catch {
    return json({ message: "No se pudo guardar el programa." }, 502);
  }
}
