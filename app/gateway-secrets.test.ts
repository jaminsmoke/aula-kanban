import { expect, it } from "vitest";
import { deriveGatewaySecrets } from "../lib/server/gateway-secrets";
import { deriveGatewaySecrets as deriveOnVps } from "../vps-manager/gateway-secrets.mjs";

it("derives the same distinct scoped credentials on Sites and the VPS", async () => {
  const token = "local-test-manager-token-with-32-bytes";
  const result = await deriveGatewaySecrets(token);
  expect(result).toEqual(deriveOnVps(token));
  expect(result.ticketSecret).not.toBe(result.serviceToken);
  expect(result.ticketSecret).not.toBe(token);
  await expect(deriveGatewaySecrets("short")).rejects.toThrow();
});
