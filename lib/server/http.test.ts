import { describe, expect, it } from "vitest";
import { isJsonRequest, isSameOrigin, json } from "./http";

const request = (headers: Record<string, string> = {}) => new Request("https://site.test/api/tasks", { headers });

describe("helpers HTTP", () => {
  it("devuelve JSON sin caché y con el estado indicado", async () => {
    const response = json({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("usa 200 por defecto", () => {
    expect(json({ ok: true }).status).toBe(200);
  });

  it("acepta solo el mismo origen", () => {
    expect(isSameOrigin(request({ origin: "https://site.test" }))).toBe(true);
    expect(isSameOrigin(request({ origin: "https://otro.test" }))).toBe(false);
    expect(isSameOrigin(request())).toBe(false);
  });

  it("acepta application/json con parámetros", () => {
    expect(isJsonRequest(request({ "content-type": "application/json" }))).toBe(true);
    expect(isJsonRequest(request({ "content-type": "Application/JSON; charset=utf-8" }))).toBe(true);
    expect(isJsonRequest(request({ "content-type": " text/plain " }))).toBe(false);
    expect(isJsonRequest(request({ "content-type": "multipart/form-data; boundary=x" }))).toBe(false);
    expect(isJsonRequest(request())).toBe(false);
  });
});
