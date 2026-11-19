import { z } from "zod";
import {
  migrateAulaDocuments,
  readAulaMigrationStatus,
  rollbackAulaMigration,
} from "../../../../lib/server/aula-documentos-migration";
import { json } from "../../../../lib/server/http";
import { withJsonMutation, withProjectRoute } from "../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Lee las apps antiguas detectadas y si existe una migración reversible. */
export const GET = withProjectRoute(async (_request, project) => {
  try {
    return json(await readAulaMigrationStatus(project.id));
  } catch {
    return json({ message: "No se pudo consultar la migración documental." }, 502);
  }
});

/**
 * Ejecuta la migración o la revierte. Los invitados solo pueden consultar el
 * estado con GET.
 */
export const POST = withJsonMutation(withProjectRoute(async (request, project) => {
  if (project.access.role === "guest") {
    return json({ message: "Las cuentas invitadas solo pueden consultar el proyecto." }, 403);
  }

  let body: unknown;
  try { body = await request.json() as unknown; } catch { return json({ message: "Solicitud no válida." }, 400); }
  const parsed = z.object({ action: z.enum(["migrate", "rollback"]) }).strict().safeParse(body);
  if (!parsed.success) return json({ message: "Acción de migración no válida." }, 400);

  try {
    const input = { projectId: project.id, userId: project.access.user.userId };
    const result = parsed.data.action === "migrate"
      ? await migrateAulaDocuments(input)
      : await rollbackAulaMigration(input);

    if (result.status === "already-migrated") {
      return json({ message: "La migración documental ya está aplicada.", status: result.status }, 409);
    }
    if (result.status === "no-data") {
      return json({ message: "No hay datos en las apps documentales anteriores.", status: result.status }, 404);
    }
    if (result.status === "no-backup") {
      return json({ message: "No hay una migración documental que deshacer.", status: result.status }, 409);
    }
    if (result.status === "invalid") {
      return json({ message: result.message, status: result.status, warnings: result.warnings ?? [] }, 400);
    }

    return json({
      action: parsed.data.action,
      status: result.status,
      document: result.document,
      updatedAt: result.updatedAt,
      sources: result.sources,
      warnings: result.warnings,
    });
  } catch {
    return json({ message: "No se pudo completar la migración documental." }, 502);
  }
}));
