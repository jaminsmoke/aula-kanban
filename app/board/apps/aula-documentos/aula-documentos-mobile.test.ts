import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "app", "board", "apps", "aula-documentos", "aula-documentos.css"), "utf8");

describe("barra móvil de Aula Documentos", () => {
  it("oculta la barra directa y usa menús de 44 px", () => {
    expect(CSS).toMatch(/\.aula-documentos-direct-tools\s*{[^}]*display:flex/);
    expect(CSS).toMatch(/\.aula-documentos-mobile-actions \.aula-documentos-menu-trigger,\s*\.aula-documentos-mobile-actions \.aula-documentos-mobile-toggle\s*{[^}]*min-height:44px/);
    expect(CSS).toMatch(/\.aula-documentos-mobile-actions \.aula-documentos-menu-item\s*{[^}]*min-height:44px/);
  });
});
