// Experimental: do not expose tickets to a public gateway until it is audited.
const identifier = /^[A-Za-z0-9_-]{1,128}$/;
const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

/**
 * Sign a short-lived launch credential.
 * @param input - Authorized identity, app and project.
 * @param secret - Dedicated signing secret.
 * @param now - Current time in milliseconds.
 * @returns A signed ticket.
 */
export async function issueVpsTicket(input: { audience: string; app: "affine" | "n8n" | "nodum"; project: string; userId: string; email: string }, secret: string, now = Date.now()) {
  if (encoder.encode(secret).length < 32 || ![input.audience, input.app, input.project, input.userId].every(value => identifier.test(value))) throw new Error("invalid_ticket_config");
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error("invalid_ticket_identity");
  const iat = Math.floor(now / 1000);
  const payload = { aud: input.audience, app: input.app, project: input.project, sub: input.userId, email, jti: crypto.randomUUID(), iat, exp: iat + 60 };
  const encoded = base64url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encoded)));
  return `${encoded}.${base64url(signature)}`;
}
