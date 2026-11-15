import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: "ok" as "ok" | "unauthenticated" | "forbidden" | "not_found" | "invalid",
}));

vi.mock("./project-access", () => ({
  resolveProject: async () => mocks.status === "ok"
    ? { status: "ok", project: { id: "p1", access: { user: { userId: "u1" }, role: "student" } } }
    : { status: mocks.status },
}));

import { withJsonMutation, withProjectRoute } from "./route-helpers";

const endpoint = "https://site.test/api/tasks?project=p1";
const jsonRequest = () => new Request(endpoint, {
  method: "POST",
  headers: { origin: "https://site.test", "content-type": "application/json" },
  body: "{}",
});

describe("helpers de rutas", () => {
  it("conserva el 403 y el 415 de las mutaciones JSON", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const mutation = withJsonMutation(handler);

    expect((await mutation(new Request(endpoint, { method: "POST" }))).status).toBe(403);
    expect((await mutation(new Request(endpoint, {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "text/plain" },
    }))).status).toBe(415);
    expect(handler).not.toHaveBeenCalled();

    expect((await mutation(jsonRequest())).status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("aplica las guardas JSON antes de resolver el proyecto", async () => {
    mocks.status = "unauthenticated";
    const handler = vi.fn(async () => new Response("ok"));
    const mutation = withJsonMutation(withProjectRoute(handler));

    const response = await mutation(new Request(endpoint, { method: "POST" }));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("traduce los fallos del proyecto y entrega el acceso resuelto", async () => {
    for (const [status, code] of [["unauthenticated", 401], ["forbidden", 403], ["not_found", 404], ["invalid", 400]] as const) {
      mocks.status = status;
      const response = await withProjectRoute(async () => new Response("ok"))(jsonRequest());
      expect(response.status).toBe(code);
    }

    mocks.status = "ok";
    const handler = vi.fn(async (_request, project) => new Response(project.id));
    const response = await withProjectRoute(handler)(jsonRequest());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("p1");
    expect(handler).toHaveBeenCalledOnce();
  });
});
