import { describe, expect, it } from "vitest";
import { issueVpsTicket } from "../lib/server/vps-ticket";
import { verifyLaunchTicket } from "../vps-manager/access-tickets.mjs";

describe("VPS launch tickets", () => {
  it("produces a ticket the isolated gateway can validate", async () => {
    const secret = "test-secret-with-at-least-32-bytes";
    const now = 1700000000000;
    const ticket = await issueVpsTicket({ audience: "site_1", app: "affine", project: "default", userId: "user_1", email: "User@Example.test" }, secret, now);
    const result = verifyLaunchTicket(ticket, { secret, audience: "site_1", now, consume: () => true });
    expect(result).toMatchObject({ aud: "site_1", sub: "user_1", email: "user@example.test", app: "affine" });
  });
  it("rejects a short secret and an invalid principal", async () => {
    const input = { audience: "site_1", app: "affine" as const, project: "default", userId: "user_1", email: "user@example.test" };
    await expect(issueVpsTicket(input, "short")).rejects.toThrow();
    await expect(issueVpsTicket({ ...input, userId: "../admin" }, "test-secret-with-at-least-32-bytes")).rejects.toThrow();
  });
});
