import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /demo/salir", () => {
  it("borra la cookie de demo y vuelve a la portada", () => {
    const response = GET();

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("__demo=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });
});
