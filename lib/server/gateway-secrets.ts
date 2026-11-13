const encoder = new TextEncoder();

/**
 * Derive isolated gateway credentials from the Site's existing manager token.
 * The derived keys do not grant access to the Docker manager.
 * @param token - High-entropy instance-specific manager secret.
 * @returns Two independently scoped credentials.
 */
export async function deriveGatewaySecrets(token: string) {
  if (encoder.encode(token).length < 32) throw new Error("invalid_manager_token");
  const key = await crypto.subtle.importKey("raw", encoder.encode(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const derive = async (purpose: string) => {
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`aula-kanban:gateway:v1:${purpose}`)));
    return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  };
  const [ticketSecret, serviceToken] = await Promise.all([derive("ticket"), derive("service")]);
  return { ticketSecret, serviceToken };
}
