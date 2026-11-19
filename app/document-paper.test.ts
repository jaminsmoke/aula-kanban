import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GLOBALS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const AULA_CSS = readFileSync(join(process.cwd(), "app", "board", "apps", "aula-documentos", "aula-documentos.css"), "utf8");
const NOTAS_CSS = readFileSync(join(process.cwd(), "app", "board", "apps", "documentos", "documentos.css"), "utf8");

/**
 * Lee las declaraciones de una hoja de estilos.
 * @param css - Contenido CSS.
 * @returns Mapa de nombre a valor.
 */
function declarations(css: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1], match[2].trim());
  }
  return result;
}

const TOKENS = declarations(GLOBALS);

/**
 * Resuelve una cadena de `var(--token)` hasta su valor final.
 * @param name - Nombre del token sin `--`.
 * @returns El color o valor resuelto.
 */
function resolveToken(name: string): string {
  let value = TOKENS.get(name) ?? "";
  for (let depth = 0; depth < 10; depth += 1) {
    const match = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
    if (!match) return value;
    value = TOKENS.get(match[1]) ?? "";
  }
  return value;
}

/**
 * Convierte un color hexadecimal a componentes RGB.
 * @param value - Color resuelto.
 * @returns Componentes en el rango 0–255.
 */
function rgb(value: string): [number, number, number] {
  const hex = value.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((part) => `${part}${part}`).join("") : hex;
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

/**
 * Calcula la luminancia relativa de un color.
 * @param value - Color hexadecimal.
 * @returns Luminancia entre 0 y 1.
 */
function luminance(value: string): number {
  const [r, g, b] = rgb(value).map((component) => {
    const channel = component / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calcula el contraste entre dos colores.
 * @param left - Primer color.
 * @param right - Segundo color.
 * @returns Ratio de contraste.
 */
function contrast(left: string, right: string): number {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("lienzo editorial", () => {
  it("mantiene la hoja blanca fuera del tema de la interfaz", () => {
    const darkTheme = GLOBALS.match(/\[data-theme="dark"\]\s*{([\s\S]*?)}/)?.[1] ?? "";

    expect(resolveToken("doc-paper")).toBe("#fff");
    expect(darkTheme).not.toMatch(/--doc-/);
  });

  it("usa los tokens del papel en Aula Documentos y Notas", () => {
    expect(AULA_CSS).toMatch(/\.aula-documentos-paper\s*{[^}]*background:var\(--doc-paper\)/);
    expect(AULA_CSS).toMatch(/\.aula-documentos-paper\s*{[^}]*color:var\(--doc-ink\)/);
    expect(NOTAS_CSS).toMatch(/\.documentos-paper\s*{[^}]*background:var\(--doc-paper\)/);
    expect(NOTAS_CSS).toMatch(/\.documentos-paper\s*{[^}]*color:var\(--doc-ink\)/);
  });

  it("mantiene selección, foco y Mermaid dentro del lienzo claro", () => {
    expect(AULA_CSS).toMatch(/\.aula-documentos-paper ::selection\s*{[^}]*background:var\(--doc-selection\)/);
    expect(AULA_CSS).toMatch(/\.aula-documentos-title:focus-visible\s*{[^}]*var\(--doc-focus\)/);
    expect(AULA_CSS).toMatch(/\.aula-mermaid-block\s*{[^}]*background:var\(--doc-mermaid-surface\)/);
    expect(AULA_CSS).toMatch(/\.aula-mermaid-preview\s*{[^}]*background:var\(--doc-paper\)/);
    expect(AULA_CSS).toMatch(/\.aula-mermaid-error\s*{[^}]*background:var\(--doc-danger-surface\)/);
  });

  it("mantiene contraste AA en texto y código", () => {
    const paper = resolveToken("doc-paper");
    const codeSurface = resolveToken("doc-code-surface");

    expect(contrast(resolveToken("doc-ink"), paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-secondary"), paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-muted"), paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-link"), paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-code-ink"), codeSurface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-selection-ink"), resolveToken("doc-selection"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-danger-ink"), resolveToken("doc-danger-surface"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(resolveToken("doc-action-text"), resolveToken("doc-action-soft"))).toBeGreaterThanOrEqual(4.5);
  });
});
