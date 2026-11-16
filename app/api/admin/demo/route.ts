import { getD1 } from "../../../../db";
import { buildDemoStatements } from "../../../../lib/domain/demo-sql";
import { getChatGPTUser } from "../../../../lib/server/auth";
import { json } from "../../../../lib/server/http";
import { isOwner } from "../../../../lib/server/project-access";
import { withJsonMutation } from "../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Prepara la demo ficticia en una sola transacción, sin aceptar SQL externo. */
export const POST = withJsonMutation(async () => {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para continuar." }, 401);
  if (!(await isOwner(user))) return json({ message: "Solo el propietario puede preparar la demo." }, 403);

  try {
    const db = getD1();
    await db.batch(buildDemoStatements().map((statement) => db.prepare(statement)));
    return json({ message: "La demo está preparada." });
  } catch {
    return json({ message: "No se pudo preparar la demo. No se han aplicado cambios; revisa posibles colisiones de identificadores." }, 409);
  }
});
