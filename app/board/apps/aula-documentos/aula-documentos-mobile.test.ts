import { describe, expect, it } from "vitest";
import { AULA_DOCUMENTOS_CSS as CSS } from "./test-css";

describe("barra móvil de Aula Documentos", () => {
  it("oculta la barra directa y usa menús de 44 px", () => {
    expect(CSS).toMatch(/\.aula-documentos-direct-tools\s*{[^}]*display:flex/);
    expect(CSS).toMatch(/\.aula-documentos-mobile-actions \.aula-documentos-menu-trigger,\s*\.aula-documentos-mobile-actions \.aula-documentos-mobile-toggle\s*{[^}]*min-height:44px/);
    expect(CSS).toMatch(/\.aula-documentos-mobile-actions \.aula-documentos-menu-item\s*{[^}]*min-height:44px/);
  });

  it("hace las acciones de tabla táctiles y contiene el desbordamiento", () => {
    expect(CSS).toMatch(/@media \(max-width: 720px\)[\s\S]*\.aula-table-action\s*{[^}]*min-height:44px/);
    expect(CSS).toMatch(/@media \(max-width: 720px\)[\s\S]*\.aula-table-picker-cell\s*{[^}]*min-height:44px/);
    expect(CSS).toMatch(/\.aula-documentos-prose \.tableWrapper\s*{[^}]*overflow-x:auto/);
    expect(CSS).toMatch(/@media print[\s\S]*\.aula-documentos-prose \.tableWrapper\s*{[^}]*overflow:visible/);
  });
});
