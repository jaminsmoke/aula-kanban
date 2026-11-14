import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../vitest.setup";
import SettingsTokens from "./settings-tokens";

type TokenRow = { id: string; label: string; lastUsedAt: number | null; createdAt: number; revokedAt: number | null };
const meta: TokenRow = { id: "t1", label: "Claude", lastUsedAt: null, createdAt: 1794686202774, revokedAt: null };
const created: TokenRow & { token: string } = { ...meta, id: "t2", token: "ak_mcp_t2_secreto" };

afterEach(() => {
  vi.unstubAllGlobals();
});

function fetchMock(initial: TokenRow[]) {
  const calls: Array<[string, string]> = [];
  let current: TokenRow[] = [...initial];
  const mock = vi.fn(async (url: string, init?: { method?: string }) => {
    const method = init?.method ?? "GET";
    calls.push([method, url]);
    if (url.startsWith("/api/mcp/tokens?id=")) {
      current = current.map((item) => (item.id === url.split("id=")[1] ? { ...item, revokedAt: Date.now() } : item));
      return jsonResponse({}, true, 204);
    }
    if (method === "POST") {
      current = [created, ...current];
      return jsonResponse(created, true, 201);
    }
    return jsonResponse(current);
  });
  vi.stubGlobal("fetch", mock);
  return calls;
}

describe("SettingsTokens", () => {
  it("lista los tokens sin secretos y muestra el estado vacío", async () => {
    fetchMock([]);
    render(<SettingsTokens />);
    expect(screen.getByText("Cargando tus tokens…")).toBeTruthy();
    expect(await screen.findByText("Todavía no tienes tokens. Crea el primero con el formulario de arriba.")).toBeTruthy();
  });

  it("crea un token y lo muestra una sola vez", async () => {
    const calls = fetchMock([meta]);
    render(<SettingsTokens />);
    expect(await screen.findByText("Claude")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Etiqueta del token"), { target: { value: "Nuevo" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear token" }));

    expect(await screen.findByText("ak_mcp_t2_secreto")).toBeTruthy();
    expect(screen.getByText("Token creado. Guárdalo ahora: solo se muestra esta vez.")).toBeTruthy();
    expect(calls.some(([method]) => method === "POST")).toBe(true);
  });

  it("revoca un token y lo marca como revocado", async () => {
    fetchMock([meta]);
    render(<SettingsTokens />);
    fireEvent.click(await screen.findByRole("button", { name: /Revocar/ }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Revocar/ })).toBeNull());
    expect(screen.getByText("Claude (revocado)")).toBeTruthy();
  });
});
