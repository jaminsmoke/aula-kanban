import { describe, expect, it } from "vitest";
import sitemap, { PUBLIC_PATHS } from "./sitemap";
import { siteUrl } from "../lib/domain/site";

const entries = sitemap();

describe("sitemap.xml", () => {
  it("lista solo las rutas públicas con URL absoluta", () => {
    expect(PUBLIC_PATHS).toEqual(["/", "/documentacion", "/privacidad", "/condiciones"]);
    expect(entries.map((entry) => entry.url)).toEqual(PUBLIC_PATHS.map((path) => new URL(path, siteUrl).toString()));
    for (const entry of entries) expect(entry.url.startsWith(siteUrl.origin)).toBe(true);
  });

  it("no incluye API, MCP ni el tablero autenticado", () => {
    for (const entry of entries) expect(entry.url).not.toMatch(/\/(api|mcp|oauth|sesion)(\/|$)/);
  });

  it("prioriza la portada sobre las páginas de apoyo", () => {
    expect(entries[0]?.priority).toBe(1);
    expect(entries.slice(1).every((entry) => entry.priority === 0.6)).toBe(true);
  });
});
