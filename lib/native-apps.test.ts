import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { AULA_STORE_VERSION, NATIVE_APPS, STORE_SUBCATEGORIES, STORE_TOP_CATEGORIES } from "./native-apps";

type Lockfile = {
  packages: Record<string, { version?: string }>;
};

const lockfile = JSON.parse(readFileSync("package-lock.json", "utf8")) as Lockfile;
const dependencies = packageJson.dependencies as Record<string, string>;

describe("catálogo de apps nativas", () => {
  it("declara una versión de la tienda, una de app y su base upstream cuando existe", () => {
    expect(AULA_STORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    for (const app of NATIVE_APPS) {
      expect(app.appVersion, `${app.id} no declara versión`).toMatch(/^\d+\.\d+\.\d+$/);
      expect(app.versionLabel ?? app.name, `${app.id} no declara etiqueta de versión`).toBeTruthy();
      if (app.upstream) {
        expect(app.upstream.name, `${app.id} no declara paquete upstream`).toBeTruthy();
        expect(app.upstream.version, `${app.id} no declara versión upstream`).toMatch(/^\d+\.\d+\.\d+$/);
      }
    }
  });

  it("cubre la taxonomía: cada app visible pertenece a ≥1 categoría y a una subcategoría del vocabulario", () => {
    expect(STORE_TOP_CATEGORIES).toContain("Educación");
    expect(STORE_TOP_CATEGORIES).toContain("Oficina");
    expect(STORE_TOP_CATEGORIES).toContain("Productividad");
    for (const app of NATIVE_APPS) {
      expect(app.categories.length, `${app.id} no tiene categoría`).toBeGreaterThan(0);
      for (const category of app.categories) {
        expect(STORE_TOP_CATEGORIES, `${app.id} usa una categoría desconocida`).toContain(category);
      }
      expect(STORE_SUBCATEGORIES, `${app.id} usa una subcategoría fuera del vocabulario`).toContain(app.subcategory);
    }
    // La cobertura actual: Educación y Productividad tienen apps; Oficina nace vacía.
    const covered = new Set(NATIVE_APPS.flatMap((app) => [...app.categories]));
    expect(covered.has("Educación")).toBe(true);
    expect(covered.has("Productividad")).toBe(true);
    expect(covered.has("Oficina")).toBe(false);
  });

  it("mantiene las versiones upstream sincronizadas con package-lock.json", () => {
    for (const app of NATIVE_APPS) {
      if (!app.upstream) continue;
      for (const dependency of [app.upstream, ...(app.extras ?? [])]) {
        const installed = lockfile.packages[`node_modules/${dependency.name}`]?.version;
        expect(dependencies[dependency.name], `${app.id}: ${dependency.name} no está en package.json`).toBeDefined();
        expect(installed, `${app.id}: ${dependency.name} no está en package-lock.json`).toBe(dependency.version);
      }
    }
  });
});
