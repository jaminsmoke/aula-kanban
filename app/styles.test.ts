import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "app");
const GLOBALS_CSS = join(APP_DIR, "globals.css");
const RAW_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;
const LEGACY_ALIASES = [
  "--canvas", "--white", "--ink", "--ink-soft", "--ink-deep", "--muted",
  "--line", "--line-strong", "--line-subtle", "--line-control", "--line-soft",
  "--line-violet", "--surface-muted", "--surface-hover", "--surface-sunken",
  "--surface-tint", "--surface-faint", "--surface-pale", "--violet",
  "--violet-dark", "--violet-pale", "--violet-bright", "--focus",
  "--focus-on-dark", "--danger", "--danger-ink", "--danger-soft", "--danger-deep",
  "--success", "--success-soft", "--warning-ink", "--warning-soft",
  "--warning-pale", "--warning-deep", "--info-ink", "--info-soft",
];

/**
 * Lista los CSS propios de la aplicación.
 * @param dir - Directorio que se recorre.
 * @returns Rutas absolutas de los archivos `.css`.
 */
function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.isFile() && entry.name.endsWith(".css") ? [path] : [];
  });
}

/**
 * Busca colores crudos y alias retirados en una hoja de estilos.
 * @param file - Ruta que se usa en el mensaje de error.
 * @param css - Contenido de la hoja.
 * @returns Una entrada por coincidencia, con archivo y línea.
 */
function styleHits(file: string, css: string): string[] {
  const hits: string[] = [];
  css.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(RAW_COLOR)) hits.push(`${file}:${index + 1} ${match[0]}`);
    for (const alias of LEGACY_ALIASES) {
      if (new RegExp(`(^|[^a-z0-9-])${alias}(?![a-z0-9-])`).test(line)) hits.push(`${file}:${index + 1} ${alias}`);
    }
  });
  return hits;
}

describe("guarda del sistema visual", () => {
  it("no admite colores crudos ni alias fuera de globals.css", () => {
    const files = cssFiles(APP_DIR).filter((file) => file !== GLOBALS_CSS);
    const hits = files.flatMap((file) => styleHits(relative(process.cwd(), file), readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });

  it("detecta un color hexadecimal y una función de color en una hoja de feature", () => {
    expect(styleHits("feature.css", ".card { color: #fff; box-shadow: 0 0 1px rgb(0 0 0 / 0.2); }")).toEqual([
      "feature.css:1 #fff",
      "feature.css:1 rgb(",
    ]);
  });
});
