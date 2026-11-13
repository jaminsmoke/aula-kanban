import { env } from "cloudflare:workers";
import hosting from "../../.openai/hosting.json";
import { deriveGatewaySecrets } from "./gateway-secrets";

type GatewayEnv = typeof env & {
  SPACE_MANAGER_TOKEN?: string;
  SPACE_MANAGER_URL?: string;
  SPACE_GATEWAY_TICKET_SECRET?: string;
  SPACE_GATEWAY_SERVICE_TOKEN?: string;
  SPACE_GATEWAY_AUDIENCE?: string;
  SPACE_GATEWAY_AFFINE_ORIGIN?: string;
};

/**
 * Read dedicated gateway values or derive isolated credentials from the manager token.
 * @returns Gateway configuration, or null when the instance is not configured.
 */
export async function gatewayConfig() {
  const config = env as GatewayEnv;
  let ticketSecret = config.SPACE_GATEWAY_TICKET_SECRET;
  let serviceToken = config.SPACE_GATEWAY_SERVICE_TOKEN;
  if ((!ticketSecret || !serviceToken) && config.SPACE_MANAGER_TOKEN) {
    const derived = await deriveGatewaySecrets(config.SPACE_MANAGER_TOKEN);
    ticketSecret ||= derived.ticketSecret;
    serviceToken ||= derived.serviceToken;
  }
  if (!ticketSecret || !serviceToken || ticketSecret === serviceToken) return null;
  return { ticketSecret, serviceToken, audience: config.SPACE_GATEWAY_AUDIENCE || hosting.project_id, affineOrigin: config.SPACE_GATEWAY_AFFINE_ORIGIN || config.SPACE_MANAGER_URL };
}
