import { describe, expect, it } from "vitest";
import robots from "./robots";
import { siteUrl } from "../lib/domain/site";

const config = robots();
const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
const disallow = rules.flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []));

describe("robots.txt", () => {
  it("permite la superficie pública y apunta al sitemap absoluto", () => {
    expect(rules[0]?.userAgent).toBe("*");
    expect(rules[0]?.allow).toBe("/");
    expect(config.sitemap).toBe(new URL("/sitemap.xml", siteUrl).toString());
  });

  it("excluye la API, el MCP, el descubrimiento OAuth y la sesión", () => {
    expect(disallow).toEqual(expect.arrayContaining(["/api/", "/mcp", "/.well-known/", "/oauth/", "/sesion"]));
  });
});
