import { SUPPORTED_SCOPES } from "../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Descubrimiento del servidor de autorización (RFC 8414).
 *
 * Lo lee el cliente MCP cuando abre el flujo OAuth: indica dónde autorizar,
 * registrarse, intercambiar el código y revocar.
 */

/**
 * Documento de metadatos del AS con rutas absolutas del origen actual.
 * @param request - Petición entrante (su origen construye las rutas).
 * @returns Los metadatos del servidor de autorización.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
  const origin = new URL(request.url).origin;
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      revocation_endpoint: `${origin}/oauth/revoke`,
      registration_endpoint: `${origin}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      revocation_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      scopes_supported: SUPPORTED_SCOPES.split(" "),
      authorization_response_modes_supported: ["query"],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
