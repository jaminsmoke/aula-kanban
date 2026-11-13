import { z } from "zod";
import { validProject } from "../../../../lib/server/project";
import { issueVpsTicket } from "../../../../lib/server/vps-ticket";
import { boundedJson } from "../../../../lib/server/bounded-json";
import { gatewayConfig } from "../../../../lib/server/gateway-config";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

/**
 * Issue a one-use launch ticket to an authenticated project member.
 * @param request - Request from the Site.
 * @returns A launch ticket or denial.
 */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ message: "Solicitud no válida." }, 403);
  const project = await validProject(request);
  if (!project) return json({ message: "No tienes acceso al proyecto." }, 403);
  let config;
  try { config = await gatewayConfig(); } catch { return json({ message: "Acceso al VPS no disponible." }, 503); }
  if (!config) return json({ message: "Acceso al VPS no disponible." }, 503);
  let body: unknown;
  try { body = await boundedJson(request, 1024); } catch { return json({ message: "Solicitud no válida." }, 400); }
  const parsed = z.object({ app: z.enum(["affine", "n8n", "nodum"]) }).strict().safeParse(body);
  if (!parsed.success) return json({ message: "Solicitud no válida." }, 400);
  try {
    // Only AFFiNE has a gateway configuration at this stage. Other apps stay closed.
    if (parsed.data.app !== "affine" || !config.affineOrigin) return json({ message: "Esta aplicación aún no está disponible." }, 503);
    const origin = new URL(config.affineOrigin);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return json({ message: "Acceso al VPS no disponible." }, 503);
    const ticket = await issueVpsTicket({ audience: config.audience, app: parsed.data.app, project: project.id, userId: project.access.user.userId, email: project.access.user.email }, config.ticketSecret);
    return json({ ticket, launchUrl: new URL("/__aula/launch", origin).toString() });
  } catch { return json({ message: "Acceso al VPS no disponible." }, 503); }
}
