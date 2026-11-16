import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, resolveSiteUrl } from "./site";

describe("URL pública del Site", () => {
  it("usa el Site actual cuando no hay configuración", () => {
    expect(resolveSiteUrl(undefined).toString()).toBe(`${DEFAULT_SITE_URL}/`);
    expect(resolveSiteUrl("").toString()).toBe(`${DEFAULT_SITE_URL}/`);
    expect(resolveSiteUrl("   ").toString()).toBe(`${DEFAULT_SITE_URL}/`);
  });

  it("normaliza una URL configurada al origen", () => {
    expect(resolveSiteUrl("https://aula.example.com").toString()).toBe("https://aula.example.com/");
    expect(resolveSiteUrl("https://aula.example.com/ruta?x=1").toString()).toBe("https://aula.example.com/");
    expect(resolveSiteUrl("http://localhost:5173/").toString()).toBe("http://localhost:5173/");
  });

  it("ignora valores no HTTP o mal formados", () => {
    expect(resolveSiteUrl("javascript:alert(1)").toString()).toBe(`${DEFAULT_SITE_URL}/`);
    expect(resolveSiteUrl("no es una url").toString()).toBe(`${DEFAULT_SITE_URL}/`);
  });
});
