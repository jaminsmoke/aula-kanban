import { z } from "zod";
import { boundedJson } from "./bounded-json";
import type { VpsPrincipal } from "./vps-access";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const encoder = new TextEncoder();

async function validServiceToken(candidate: string, expected: string) {
  if (encoder.encode(expected).length < 32 || candidate.length > 512 || !candidate) return false;
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const expectedKey = await crypto.subtle.importKey("raw", encoder.encode(expected), algorithm, false, ["sign", "verify"]);
  const candidateKey = await crypto.subtle.importKey("raw", encoder.encode(candidate), algorithm, false, ["sign"]);
  const message = encoder.encode("aula-vps-service-auth-v1");
  const signature = await crypto.subtle.sign("HMAC", candidateKey, message);
  return crypto.subtle.verify("HMAC", expectedKey, signature, message);
}

/**
 * Handle a gateway authorization query.
 * @param request - Request from the gateway.
 * @param config - Distinct service and ticket secrets and current-access resolver.
 * @returns Current role or denial.
 */
export async function authorizeVpsRequest(request: Request, config: { serviceToken?: string; ticketSecret?: string; access: (principal: VpsPrincipal) => Promise<string | null> }) {
  const secret = config.serviceToken;
  if (!secret || !config.ticketSecret || secret === config.ticketSecret) return json({ allowed: false }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || !await validServiceToken(authorization.slice(7), secret)) return json({ allowed: false }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return json({ allowed: false }, 400);
  let body: unknown;
  try { body = await boundedJson(request); } catch { return json({ allowed: false }, 400); }
  const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
  const parsed = z.object({ userId: id, projectId: id, email: z.string().email().max(254), app: z.enum(["affine", "n8n", "nodum"]) }).strict().safeParse(body);
  if (!parsed.success) return json({ allowed: false }, 400);
  try {
    const role = await config.access(parsed.data);
    return role ? json({ allowed: true, role }) : json({ allowed: false }, 403);
  } catch { return json({ allowed: false }, 503); }
}
