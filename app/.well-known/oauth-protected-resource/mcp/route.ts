import { SUPPORTED_SCOPES } from "../../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Descubrimiento del recurso protegido (RFC 9728) para `/api/mcp`.
 *
 * El cliente MCP lo lee al recibir el `401` con `resource_metadata` y
 * descubre de ahí el servidor de autorización de este Site.
 */

/**
 * Documento del recurso protegido con su `resource` y sus alcances.
 * @param request - Petición entrante (su origen construye las rutas).
 * @returns Los metadatos del recurso protegido.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
  const origin = new URL(request.url).origin;
  return Response.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: SUPPORTED_SCOPES.split(" "),
      bearer_methods_supported: ["header"],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
