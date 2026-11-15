import Link from "next/link";
import { redirect } from "next/navigation";
import { getD1 } from "../../../db";
import { chatGPTSignInPath, getChatGPTUser } from "../../../lib/server/auth";
import { ALL_SCOPES, getClient, normalizeScopes } from "../../../lib/server/oauth/service";
import "./authorize.css";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Página de consentimiento OAuth (roadmap OAuth 2.1, Fase 1).
 *
 * El cliente MCP/GPT llega aquí empuñado por la sesión SIWC del navegador:
 * la página valida el cliente, su `redirect_uri` exacta y la presencia de
 * PKCE S256 antes de mostrar nada; el resultado se envía con POST a
 * `/oauth/authorize/consent`, que redirige al cliente con el código.
 * @param props - Parámetros del flujo OAuth en la query string.
 * @returns La página de consentimiento o un error/redirect.
 */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.NODE_ENV === "production") return <main className="oauth-error"><h1>OAuth experimental no disponible</h1><p>Usa el plugin de Sites para conectar Aula Kanban.</p></main>;
  const params = await searchParams;
  const clientId = firstParam(params.client_id);
  const redirectUri = firstParam(params.redirect_uri);
  const responseType = firstParam(params.response_type);
  const codeChallenge = firstParam(params.code_challenge);
  const codeChallengeMethod = firstParam(params.code_challenge_method);
  const scope = firstParam(params.scope);
  const state = firstParam(params.state);
  const resource = firstParam(params.resource);

  const user = await getChatGPTUser();
  if (!user) {
    const returnTo = `/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: responseType, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod || "S256", scope, state, resource }).toString()}`;
    redirect(chatGPTSignInPath(returnTo));
  }

  let db;
  try {
    db = getD1();
  } catch {
    return <main className="oauth-error"><p>La base de datos no está disponible.</p></main>;
  }

  const client = clientId ? await getClient(db, clientId) : null;
  const redirectRegistered = Boolean(client && redirectUri && client.redirectUris.includes(redirectUri));
  const authorizedScope = scope.trim() ? normalizeScopes(scope) : ALL_SCOPES;

  // Errores que sí pueden volver al cliente por su redirect_uri registrada.
  const redirectError = (error: string, description: string) => {
    if (!redirectRegistered) return null;
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (state) url.searchParams.set("state", state);
    return url.toString();
  };

  const blocked = (error: string, description: string, title: string, canRedirect: boolean) => {
    const target = canRedirect ? redirectError(error, description) : null;
    if (target && responseType === "code") redirect(target);
    return (
      <main className="oauth-error">
        <p className="oauth-eyebrow">Aula Kanban</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="oauth-back" href="/">Volver a Clase</Link>
      </main>
    );
  };

  if (!client) {
    return blocked("invalid_client", "Este cliente no está registrado en Aula Kanban.", "Cliente no reconocido", false);
  }
  if (!redirectRegistered) {
    return blocked("invalid_request", "El redirect_uri no coincide con los registrados para este cliente.", "Dirección de vuelta no válida", false);
  }
  if (responseType !== "code") {
    return blocked("unsupported_response_type", "Solo se admite response_type=code.", "Tipo de respuesta no soportado", true);
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return blocked("invalid_request", "OAuth exige PKCE con code_challenge_method=S256.", "PKCE obligatorio", true);
  }
  const permissionSet = new Set(authorizedScope.split(" "));
  const outsideClient = authorizedScope.split(" ").some((scope) => scope && !client.scopes.includes(scope));
  if (outsideClient || !authorizedScope || permissionSet.size === 0) {
    return blocked("invalid_scope", "El alcance solicitado no está permitido para este cliente.", "Alcance no válido", true);
  }

  const clientName = client.clientName || `cliente ${client.clientId.slice(0, 8)}`;
  let redirectHost = redirectUri;
  try {
    redirectHost = new URL(redirectUri).hostname;
  } catch {
    redirectHost = redirectUri;
  }

  const hiddenFields = {
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scope: authorizedScope,
    state,
    resource,
  } as Record<string, string>;

  return (
    <main className="oauth-shell">
      <section className="oauth-card" aria-labelledby="oauth-title">
        <p className="oauth-eyebrow">Aula Kanban</p>
        <h1 id="oauth-title">Permitir el acceso</h1>
        <p>
          <strong>{clientName}</strong> quiere trabajar con tu cuenta en este Site. Al autorizar, el cliente podrá
          {authorizedScope.includes("mcp:read") && <> consultar tus proyectos y tareas</>}
          {authorizedScope.includes("mcp:write") && <> y crear o mover tus tareas</>}.
        </p>
        <dl className="oauth-facts">
          <div><dt>Cliente</dt><dd>{clientName}</dd></div>
          <div><dt>Alcances</dt><dd>{authorizedScope}</dd></div>
          <div><dt>Los tokens van a</dt><dd>{redirectHost}</dd></div>
        </dl>
        <p className="oauth-note">Autoriza solo clientes de confianza. Las conexiones OAuth se revocan desde el cliente compatible; Ajustes &gt; Cuenta gestiona los tokens personales del MCP.</p>
        <form className="oauth-actions" method="post" action="/oauth/authorize/consent">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button type="submit" name="action" value="approve" className="primary">Autorizar</button>
          <button type="submit" name="action" value="deny" className="secondary">Denegar</button>
        </form>
      </section>
    </main>
  );
}
