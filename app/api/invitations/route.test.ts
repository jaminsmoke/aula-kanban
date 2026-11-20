import { describe, expect, it, vi } from "vitest";
import { DEMO_USER } from "../../../lib/domain/demo";
import type { ChatGPTUser } from "../../../lib/server/access/auth";

const mocks = vi.hoisted(() => ({ user: null as ChatGPTUser | null, accept: vi.fn() }));

vi.mock("../../../lib/server/access/auth", () => ({ getChatGPTUser: async () => mocks.user }));
vi.mock("../../../lib/server/access/invitaciones", () => ({
  acceptInvitation: mocks.accept,
  listPendingInvitations: async () => [],
}));

import { POST } from "./route";

describe("aceptar invitaciones", () => {
  it("rechaza la demo sin intentar aceptar nada", async () => {
    mocks.user = { ...DEMO_USER };
    const response = await POST(new Request("https://site.test/api/invitations", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: JSON.stringify({ id: "00000000-0000-4000-8000-000000000000" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.accept).not.toHaveBeenCalled();
  });
});
