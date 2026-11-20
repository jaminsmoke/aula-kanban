import { describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ get }) }));

import { isDemoRequested } from "./demo";

describe("demo", () => {
  it("se activa solo con la cookie en 1", async () => {
    get.mockReturnValue({ value: "1" });
    await expect(isDemoRequested()).resolves.toBe(true);

    get.mockReturnValue({ value: "0" });
    await expect(isDemoRequested()).resolves.toBe(false);

    get.mockReturnValue(undefined);
    await expect(isDemoRequested()).resolves.toBe(false);
  });

  it("no falla fuera de una petición", async () => {
    get.mockImplementation(() => { throw new Error("sin contexto"); });
    await expect(isDemoRequested()).resolves.toBe(false);
  });
});
