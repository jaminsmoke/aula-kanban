import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  headers: new Headers(),
  demo: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({
    get: (name: string) => (name === "__demo" && state.demo ? { value: state.demo } : undefined),
  }),
}));

import { getChatGPTUser } from "./auth";
import { DEMO_USER } from "../../domain/demo";

describe("sesión de la demo", () => {
  it("devuelve la identidad fija cuando solo hay cookie de demo", async () => {
    state.headers = new Headers();
    state.demo = "1";
    await expect(getChatGPTUser()).resolves.toEqual(DEMO_USER);
  });

  it("no inventa sesión sin cabeceras ni cookie", async () => {
    state.headers = new Headers();
    state.demo = undefined;
    await expect(getChatGPTUser()).resolves.toBeNull();
  });

  it("la sesión real de Sites tiene prioridad sobre la demo", async () => {
    state.headers = new Headers({
      "oai-authenticated-user-id": "u1",
      "oai-authenticated-user-email": "docente@example.com",
    });
    state.demo = "1";
    await expect(getChatGPTUser()).resolves.toEqual({
      userId: "u1",
      displayName: "docente@example.com",
      email: "docente@example.com",
      fullName: null,
    });
  });
});
