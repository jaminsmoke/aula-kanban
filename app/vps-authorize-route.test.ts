import { beforeEach, expect, it } from "vitest";
import { authorizeVpsRequest } from "../lib/server/vps-authorize-handler";
const context = { env: { SPACE_GATEWAY_SERVICE_TOKEN: "service-token-at-least-32-characters", SPACE_GATEWAY_TICKET_SECRET: "different-ticket-secret-at-least-32-bytes" }, role: "student" as string | null };
const POST = (request: Request) => authorizeVpsRequest(request, { serviceToken: context.env.SPACE_GATEWAY_SERVICE_TOKEN, ticketSecret: context.env.SPACE_GATEWAY_TICKET_SECRET, access: async () => context.role });
const payload = { userId: "user1", projectId: "default", email: "user@example.test", app: "affine" };
const request = (token: string, body: unknown = payload) => new Request("https://site.test/api/space-access/authorize", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { context.role = "student"; });

it("denies forged credentials and accepts a distinct valid service credential", async () => {
  expect((await POST(request("wrong-token"))).status).toBe(403);
  expect((await POST(request(context.env.SPACE_GATEWAY_SERVICE_TOKEN))).status).toBe(200);
});
it("denies revoked users and malformed principals", async () => {
  context.role = null;
  expect((await POST(request(context.env.SPACE_GATEWAY_SERVICE_TOKEN))).status).toBe(403);
  expect((await POST(request(context.env.SPACE_GATEWAY_SERVICE_TOKEN, { ...payload, extra: true }))).status).toBe(400);
});
