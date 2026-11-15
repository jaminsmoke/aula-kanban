import { getD1 } from "../../../db";
import { clientCredentialsFrom, databaseUnavailable, oauthJson } from "../../../lib/server/oauth/http";
import { revokeToken } from "../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Revocación de tokens (RFC 7009).
 *
 * El cliente puede revocar sus tokens de acceso y de refresco. Sin
 * autenticación no se revoca nada que no pertenezca al cliente.
 */

/**
 * Revoca el token indicado.
 * @param request - Petición `application/x-www-form-urlencoded` con `token`.
 * @returns 200 `{}` siempre, lo haya revocado o no.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return oauthJson({ error: "temporarily_unavailable" }, 503);
  let db;
  try {
    db = getD1();
  } catch {
    return databaseUnavailable();
  }
  const form = new URLSearchParams(await request.text());
  const token = form.get("token");
  if (token) {
    const credentials = clientCredentialsFrom(request, form);
    await revokeToken(db, {
      token,
      tokenTypeHint: form.get("token_type_hint") ?? undefined,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    });
  }
  return oauthJson({});
}
