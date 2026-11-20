import { describe, expect, it, vi } from "vitest";

const { findProject } = vi.hoisted(() => ({ findProject: vi.fn() }));

vi.mock("../../lib/server/projects/project-access", () => ({ findProject }));

import { GET } from "./route";
import { DEMO_PROJECT_ID } from "../../lib/domain/demo";

describe("GET /demo", () => {
  it("activa la cookie y redirige al tablero demo", async () => {
    findProject.mockResolvedValue({ id: DEMO_PROJECT_ID, name: "Proyecto de demostración", createdAt: 1 });

    const response = await GET();

    expect(findProject).toHaveBeenCalledWith(DEMO_PROJECT_ID);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`/?project=${DEMO_PROJECT_ID}`);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("__demo=1");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("explica cómo sembrar la demo si falta el proyecto", async () => {
    findProject.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("npm run seed:demo");
  });
});
