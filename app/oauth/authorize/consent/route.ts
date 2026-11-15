import { getD1 } from "../../../../db";
import { chatGPTSignInPath, getChatGPTUser } from "../../../../lib/server/auth";
import { isSameOrigin } from "../../../../lib/server/http";
import { createAuthorizationCode, getClient, normalizeScopes } from "../../../../lib/server/oauth/service";

export const dynamic = "force-dynamic";

/**
 * Consentimiento OAuth (roadmap OAuth 2.1, Fase 1).
 *
 * Mutación del navegador con sesión SIWC: mantiene la guarda de mismo
 * origen. Al aprobar, crea el código de autorización y redirige al cliente;
 * al denegar, redirige con `error=access_denied`.
 */

/**
 * Atiende el POST del formulario de consentimiento.
 * @param request - Formulario con los parámetros del flujo OAuth.
 * @returns 302 al cliente con `code` (o `error`) y `state`, o mensaje de error.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("OAuth experimental no disponible.", { status: 503 });
  const user = await getChatGPTUser();
  if (!user) {
    const signIn = chatGPTSignInPath("/oauth/authorize");
    return Response.redirect(new URL(signIn, new URL(request.url).origin).toString(), 302);
  }
  if (!isSameOrigin(request)) {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded") {
    return new Response("Formato no válido.", { status: 415 });
  }
  const form = new URLSearchParams(await request.text());
  const action = form.get("action");
  const clientId = form.get("client_id") ?? "";
  const redirectUri = form.get("redirect_uri") ?? "";
  const codeChallenge = form.get("code_challenge") ?? "";
  const scope = form.get("scope") ?? "";
  const state = form.get("state") ?? "";
  const resource = form.get("resource") ?? "";

  let db;
  try {
    db = getD1();
  } catch {
    return new Response("Base de datos no disponible.", { status: 503 });
  }

  const client = await getClient(db, clientId);
  if (!client || !redirectUri || !client.redirectUris.includes(redirectUri)) {
    return new Response("Cliente o redirect_uri no válido.", { status: 400 });
  }

  const redirectError = (error: string, description: string) => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state) url.searchParams.set("state", state);
    return Response.redirect(url.toString(), 302);
  };

  if (action === "deny") {
    return redirectError("access_denied", "La cuenta no autorizó al cliente.");
  }
  if (action !== "approve") return new Response("Acción de consentimiento no válida.", { status: 400 });

  const authorizedScope = normalizeScopes(scope);
  if (!authorizedScope || authorizedScope.split(" ").some((item) => item && !client.scopes.includes(item))) {
    return redirectError("invalid_scope", "El alcance solicitado no está permitido para este cliente.");
  }
  if (!codeChallenge) {
    return redirectError("invalid_request", "Se necesita code_challenge (PKCE S256).");
  }

  const code = await createAuthorizationCode(db, {
    clientId,
    user: { userId: user.userId, email: user.email },
    redirectUri,
    codeChallenge,
    scope: authorizedScope,
    resource,
  });
  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return Response.redirect(target.toString(), 302);
}
