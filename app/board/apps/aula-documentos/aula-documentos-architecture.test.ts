import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "app", "board", "apps", "aula-documentos");

/**
 * Cuenta las líneas de un archivo del proyecto.
 * @param path - Ruta relativa a Aula Documentos.
 * @returns Número de líneas.
 */
function lineCount(path: string): number {
  return readFileSync(join(APP_DIR, path), "utf8").split(/\r?\n/).length;
}

/**
 * Enumera archivos de una carpeta.
 * @param path - Ruta relativa a Aula Documentos.
 * @param extension - Extensión que debe coincidir.
 * @returns Rutas relativas.
 */
function filesIn(path: string, extension: string): string[] {
  return readdirSync(join(APP_DIR, path), { recursive: true })
    .map((file) => String(file).replaceAll("\\", "/"))
    .filter((file) => file.endsWith(extension))
    .map((file) => `${path}/${file}`);
}

describe("arquitectura de Aula Documentos", () => {
  it("mantiene el shell de la app por debajo de 450 líneas", () => {
    expect(lineCount("aula-documentos-app.tsx")).toBeLessThan(450);
  });

  it("mantiene hooks y componentes por debajo de 600 líneas", () => {
    for (const file of [...filesIn("hooks", ".ts"), ...filesIn("hooks", ".tsx"), ...filesIn("components", ".tsx")]) {
      expect(lineCount(file), file).toBeLessThanOrEqual(600);
    }
  });

  it("mantiene cada archivo CSS por debajo de 500 líneas", () => {
    for (const file of filesIn("styles", ".css")) {
      expect(lineCount(file), file).toBeLessThanOrEqual(500);
    }
  });

  it("mantiene las pruebas de la app por debajo de 600 líneas", () => {
    for (const file of readdirSync(APP_DIR).filter((name) => name.endsWith(".test.tsx"))) {
      expect(lineCount(file), file).toBeLessThanOrEqual(600);
    }
  });

  it("no introduce dependencias de componentes hacia el shell", () => {
    for (const file of [...filesIn("hooks", ".ts"), ...filesIn("hooks", ".tsx"), ...filesIn("components", ".tsx")]) {
      const source = readFileSync(join(APP_DIR, file), "utf8");
      expect(source, file).not.toMatch(/from\s+"[^"]*aula-documentos-app"/);
    }
  });

  it("mantiene shared y lib sin dependencias de apps", () => {
    const roots = [
      // En `shared`, `../apps/…` apunta a las apps de la UI.
      { dir: join(process.cwd(), "app", "board", "shared"), apps: /from\s+"[^"]*(?:app\/(?:board|api)|\.\.\/apps\/)/ },
      // En `lib`, solo se prohíben las rutas al árbol `app/`.
      { dir: join(process.cwd(), "lib", "domain"), apps: /from\s+"[^"]*app\/(?:board|api)/ },
      { dir: join(process.cwd(), "lib", "server"), apps: /from\s+"[^"]*app\/(?:board|api)/ },
    ];
    for (const { dir: root, apps } of roots) {
      for (const file of readdirSync(root, { recursive: true }).map(String).filter((name) => /\.(ts|tsx)$/.test(name))) {
        const source = readFileSync(join(root, file), "utf8");
        expect(source, `${root}/${file}`).not.toMatch(apps);
        if (root.endsWith("domain") && !file.endsWith(".test.ts")) {
          expect(source, `${root}/${file}`).not.toMatch(/from\s+"react"/);
        }
      }
    }
  });
});
