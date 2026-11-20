import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const globalsPath = join(root, "app", "globals.css");

/**
 * Recorre un directorio y devuelve sus CSS.
 * @param directory - Directorio de partida.
 * @returns Rutas absolutas.
 */
function cssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return cssFiles(join(directory, entry.name));
    return extname(entry.name) === ".css" ? [join(directory, entry.name)] : [];
  });
}

describe("tokens CSS", () => {
  it("conserva las primitivas fuera de los features y define los tokens base", () => {
    const globals = readFileSync(globalsPath, "utf8");
    const files = cssFiles(join(root, "app")).filter((file) => file !== globalsPath);
    const primitiveUses = files.flatMap((file) => {
      const contents = readFileSync(file, "utf8");
      return contents.includes("var(--primitive-") ? [relative(root, file)] : [];
    });

    expect(primitiveUses).toEqual([]);
    for (const token of [
      "--ui-focus-ring",
      "--ui-focus-offset",
      "--ui-control-height",
      "--ui-icon-button-size",
      "--ui-space-2",
      "--ui-space-3",
      "--ui-space-4",
      "--radius-sm",
    ]) {
      expect(globals).toContain(`${token}:`);
    }
    expect(globals.split(/\r?\n/).filter((line) => line.trim()).length).toBeLessThan(500);
  });

  it("no referencia tokens ui inexistentes", () => {
    const allCss = [globalsPath, ...cssFiles(join(root, "app"))];
    const definitions = new Set(
      allCss.flatMap((file) => [
        ...readFileSync(file, "utf8").matchAll(/--ui-[a-z0-9-]+\s*:/g),
      ].map((match) => match[0].replace(/\s*:$/, ""))),
    );
    const missing = allCss.flatMap((file) => {
      const contents = readFileSync(file, "utf8");
      return [...contents.matchAll(/var\((--ui-[a-z0-9-]+)/g)]
        .map((match) => match[1])
        .filter((token) => !definitions.has(token))
        .map((token) => `${relative(root, file)}: ${token}`);
    });

    expect([...new Set(missing)]).toEqual([]);
  });
});
