import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { AULA_STORE_VERSION, NATIVE_APPS } from "./native-apps";

type Lockfile = {
  packages: Record<string, { version?: string }>;
};

const lockfile = JSON.parse(readFileSync("package-lock.json", "utf8")) as Lockfile;
const dependencies = packageJson.dependencies as Record<string, string>;

describe("catálogo de apps nativas", () => {
  it("declara una versión de la tienda, una de app y una base upstream", () => {
    expect(AULA_STORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    for (const app of NATIVE_APPS) {
      expect(app.appVersion, `${app.id} no declara versión`).toMatch(/^\d+\.\d+\.\d+$/);
      expect(app.versionLabel ?? app.name, `${app.id} no declara etiqueta de versión`).toBeTruthy();
      expect(app.upstream.name, `${app.id} no declara paquete upstream`).toBeTruthy();
      expect(app.upstream.version, `${app.id} no declara versión upstream`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("mantiene las versiones upstream sincronizadas con package-lock.json", () => {
    for (const app of NATIVE_APPS) {
      for (const dependency of [app.upstream, ...(app.extras ?? [])]) {
        const installed = lockfile.packages[`node_modules/${dependency.name}`]?.version;
        expect(dependencies[dependency.name], `${app.id}: ${dependency.name} no está en package.json`).toBeDefined();
        expect(installed, `${app.id}: ${dependency.name} no está en package-lock.json`).toBe(dependency.version);
      }
    }
  });
});
