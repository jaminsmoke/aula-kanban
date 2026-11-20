import { getChatGPTUser } from "../../../../lib/server/access/auth";
import { seedDemoProject } from "../../../../lib/server/demo/demo-seed";
import { json } from "../../../../lib/server/http";
import { isOwner } from "../../../../lib/server/projects/project-access";
import { withJsonMutation } from "../../../../lib/server/route-helpers";

export const dynamic = "force-dynamic";

/** Prepara la demo ficticia en una sola transacción, sin aceptar SQL externo. */
export const POST = withJsonMutation(async () => {
  const user = await getChatGPTUser();
  if (!user) return json({ message: "Inicia sesión para continuar." }, 401);
  if (!(await isOwner(user))) return json({ message: "Solo el propietario puede preparar la demo." }, 403);

  const result = await seedDemoProject();
  return result.ok
    ? json({ message: "La demo está preparada." })
    : json({ message: result.message }, 409);
});
