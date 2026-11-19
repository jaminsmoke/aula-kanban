import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import {
  AULA_STORE_VERSION,
  DOCUMENT_SUITE_LEGACY_APP_IDS,
  NATIVE_APPS,
  STORE_SUBCATEGORIES,
  STORE_TOP_CATEGORIES,
  resolveAppRouteId,
} from "./native-apps";

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
    // La cobertura actual: Educación, Productividad y Oficina tienen apps.
    const covered = new Set(NATIVE_APPS.flatMap((app) => [...app.categories]));
    expect(covered.has("Educación")).toBe(true);
    expect(covered.has("Productividad")).toBe(true);
    expect(covered.has("Oficina")).toBe(true);
  });

  it("retira las apps documentales antiguas y resuelve sus enlaces a Aula Documentos", () => {
    for (const id of DOCUMENT_SUITE_LEGACY_APP_IDS) {
      expect(NATIVE_APPS.find((app) => app.id === (id as string)), `${id} ya no debe estar en el catálogo`).toBeUndefined();
      expect(resolveAppRouteId(id)).toBe("aula-documentos");
    }
    expect(NATIVE_APPS.find((app) => app.id === "aula-documentos")).toBeTruthy();
    expect(resolveAppRouteId("edu-tools")).toBe("calculadora");
    expect(resolveAppRouteId("calculadora")).toBe("calculadora");
  });

  it("declara la suite de Aula Documentos con módulos, formatos y migración", () => {
    const app = NATIVE_APPS.find((item) => item.id === "aula-documentos");
    expect(app?.suite).toBeDefined();
    const suite = app!.suite!;

    expect(suite.promise).toContain("suite documental");
    expect(suite.modules).toEqual(["Notas", "Diagramas", "Presentaciones", "Office"]);
    expect(suite.formats.open).toEqual(["DOCX", "XLSX", "PPTX", "Markdown"]);
    expect(suite.formats.export).toEqual(["HTML", "Markdown", "DOCX", "PPTX"]);
    expect(suite.migration?.note).toContain("Migrar apps antiguas");

    const replacedIds = suite.migration?.replaces.map((source) => source.id).sort() ?? [];
    expect(replacedIds).toEqual([...DOCUMENT_SUITE_LEGACY_APP_IDS].sort());
    for (const id of replacedIds) {
      expect(NATIVE_APPS.some((candidate) => candidate.id === (id as string)), `${id} no debe seguir instalable`).toBe(false);
    }
  });

  it("valida todas las suites y conserva la ficha clásica en las apps individuales", () => {
    const suites = NATIVE_APPS.filter((app) => app.suite);
    expect(suites.length).toBeGreaterThan(0);

    for (const app of suites) {
      const suite = app.suite!;
      expect(suite.promise.trim(), `${app.id}: promesa vacía`).toBe(suite.promise);
      expect(suite.promise.length, `${app.id}: promesa demasiado corta`).toBeGreaterThan(20);
      expect(new Set(suite.modules).size, `${app.id}: módulos repetidos`).toBe(suite.modules.length);
      expect(suite.modules.every((module) => module.trim() === module && module.length > 0)).toBe(true);

      expect(suite.capabilities.length, `${app.id}: sin capacidades`).toBeGreaterThan(0);
      expect(new Set(suite.capabilities.map((group) => group.title)).size).toBe(suite.capabilities.length);
      for (const group of suite.capabilities) {
        expect(group.title.trim()).toBe(group.title);
        expect(group.items.length).toBeGreaterThan(0);
        expect(group.items.every((item) => item.trim() === item && item.length > 0)).toBe(true);
        expect(new Set(group.items).size).toBe(group.items.length);
      }

      for (const formats of [suite.formats.open, suite.formats.export]) {
        expect(formats.length).toBeGreaterThan(0);
        expect(formats.every((format) => format.trim() === format && format.length > 0)).toBe(true);
        expect(new Set(formats).size).toBe(formats.length);
      }

      for (const screenshot of suite.screenshots ?? []) {
        expect(screenshot.src.startsWith("/"), `${app.id}: captura sin ruta local`).toBe(true);
        expect(screenshot.alt.trim()).toBeTruthy();
      }

      if (suite.migration) {
        expect(suite.migration.note.trim()).toBe(suite.migration.note);
        expect(suite.migration.note.length).toBeGreaterThan(0);
        expect(new Set(suite.migration.replaces.map((source) => source.id)).size)
          .toBe(suite.migration.replaces.length);
        for (const source of suite.migration.replaces) {
          expect(source.name.trim()).toBeTruthy();
          expect(DOCUMENT_SUITE_LEGACY_APP_IDS).toContain(source.id);
        }
      }
    }

    expect(NATIVE_APPS.find((app) => app.id === "excalidraw")?.suite).toBeUndefined();
    expect(NATIVE_APPS.find((app) => app.id === "calculadora")?.suite).toBeUndefined();
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
