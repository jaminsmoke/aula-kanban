import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, THEME_STORAGE_VERSION } from "../../theme";
import { useTheme } from "./use-theme";

function stubSystemTheme(prefersDark = false) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("preferencia de tema persistida", () => {
  beforeEach(() => {
    stubSystemTheme();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lee una preferencia legada", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.preference).toBe("dark"));
    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("lee la envoltura versionada y conserva la elección tras remontar", async () => {
    const first = renderHook(() => useTheme());
    act(() => first.result.current.setPreference("dark"));

    expect(JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null")).toMatchObject({
      __aulaClientStorage: 1,
      version: THEME_STORAGE_VERSION,
      data: "dark",
    });

    first.unmount();
    const second = renderHook(() => useTheme());
    await waitFor(() => expect(second.result.current.preference).toBe("dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("usa system ante datos corruptos o una versión futura", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "{ roto");
    const corrupt = renderHook(() => useTheme());
    await waitFor(() => expect(corrupt.result.current.preference).toBe("system"));
    corrupt.unmount();

    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      __aulaClientStorage: 1,
      version: THEME_STORAGE_VERSION + 1,
      data: "dark",
    }));
    const future = renderHook(() => useTheme());
    await waitFor(() => expect(future.result.current.preference).toBe("system"));
  });
});
