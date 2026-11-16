import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const user = { userId: "u1", displayName: "Seedy", email: "seedy@sites.test", fullName: null };
const getChatGPTUser = vi.fn(async (): Promise<typeof user | null> => user);
const redirectMock = vi.fn((url: string) => { throw new Error(`redirect:${url}`); });

vi.mock("../lib/server/auth", () => ({
  getChatGPTUser: () => getChatGPTUser(),
  chatGPTSignInPath: (returnTo: string) => `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`,
}));
vi.mock("../lib/server/demo-availability", () => ({ isDemoAvailable: async () => true }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirectMock(url) }));
vi.mock("./board", () => ({ default: ({ user: u, initial }: { user: { displayName: string }; initial?: { app?: string | null } }) => <div>Tablero de {u.displayName}<span>{initial?.app ?? "sin-app"}</span></div> }));
vi.mock("./portada", () => ({ default: ({ signInHref }: { signInHref: string }) => <div>Portada <a href={signInHref}>Iniciar sesión con ChatGPT</a> <a href="/documentacion">Ver documentación</a></div> }));

import Page from "./page";

describe("Page: portada sin sesión y tablero con sesión", () => {
  it("sin sesión muestra la portada, sin redirigir al login", async () => {
    getChatGPTUser.mockResolvedValueOnce(null);
    const view = render(await Page({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/Portada/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión con ChatGPT" }).getAttribute("href")).toBe("/signin-with-chatgpt?return_to=%2F");
    expect(screen.getByRole("link", { name: "Ver documentación" }).getAttribute("href")).toBe("/documentacion");
    expect(redirectMock).not.toHaveBeenCalled();
    view.unmount();
  });

  it("sin sesión, el inicio de sesión conserva la URL profunda pedida", async () => {
    getChatGPTUser.mockResolvedValueOnce(null);
    const view = render(await Page({ searchParams: Promise.resolve({ project: "p1", view: "ajustes", section: "administradores" }) }));
    expect(screen.getByRole("link", { name: "Iniciar sesión con ChatGPT" }).getAttribute("href")).toBe("/signin-with-chatgpt?return_to=%2F%3Fproject%3Dp1%26view%3Dajustes%26section%3Dadministradores");
    view.unmount();
  });

  it("con sesión muestra el tablero", async () => {
    const view = render(await Page({ searchParams: Promise.resolve({ project: "p1", view: "alumnos" }) }));
    expect(screen.getByText("Tablero de Seedy")).toBeTruthy();
    expect(screen.getByText("sin-app")).toBeTruthy();
    view.unmount();
  });

  it("conserva la app de Tienda al pasar el estado al tablero", async () => {
    const view = render(await Page({ searchParams: Promise.resolve({ project: "p1", view: "espacio", app: "excalidraw" }) }));
    expect(screen.getByText("excalidraw")).toBeTruthy();
    view.unmount();
  });

  it("Documentación sin sesión sigue yendo a /documentacion", async () => {
    getChatGPTUser.mockResolvedValueOnce(null);
    await expect(Page({ searchParams: Promise.resolve({ view: "documentacion" }) })).rejects.toThrow("redirect:/documentacion");
    expect(redirectMock).toHaveBeenCalledWith("/documentacion");
  });
});
