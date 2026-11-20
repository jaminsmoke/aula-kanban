import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, resolveTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, THEME_STORAGE_VERSION } from "./theme";

function stubSystemTheme(prefersDark: boolean) {
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

function runInitScript() {
  new Function(THEME_INIT_SCRIPT)();
}

describe("tema", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  });

  it("resuelve la preferencia manual y la del sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("aplica el tema al documento", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("aplica la preferencia guardada antes de hidratar", () => {
    stubSystemTheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("lee la preferencia desde la envoltura versionada", () => {
    stubSystemTheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      __aulaClientStorage: 1,
      version: THEME_STORAGE_VERSION,
      data: "dark",
    }));

    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignora una versión futura de la preferencia", () => {
    stubSystemTheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
      __aulaClientStorage: 1,
      version: THEME_STORAGE_VERSION + 1,
      data: "dark",
    }));

    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("sigue al sistema cuando no hay una elección manual", () => {
    stubSystemTheme(true);
    runInitScript();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
