import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".vinext",
  ".wrangler",
  ".sites-runtime",
  "coverage",
  "outputs",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".mjs"]);
const removedSymbols = [
  "use-versioned-draft",
  "versioned-draft-recovery",
  "unsaved-changes-dialog",
  "version-conflict-dialog",
  "useVersionedDraft",
  "readVersionedDraftRecovery",
  "UnsavedChangesDialog",
  "VersionConflictDialog",
];

/**
 * Recorre un directorio y devuelve sus archivos de código.
 * @param directory - Directorio de partida.
 * @returns Rutas absolutas.
 */
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : sourceFiles(join(directory, entry.name));
    }
    return sourceExtensions.has(extname(entry.name)) ? [join(directory, entry.name)] : [];
  });
}

describe("limpieza de borradores versionados", () => {
  it("no conserva símbolos del sistema retirado en el código de producto", () => {
    const references = ["app", "lib"]
      .flatMap((directory) => sourceFiles(join(root, directory)))
      .flatMap((file) => {
        const contents = readFileSync(file, "utf8");
        return removedSymbols
          .filter((symbol) => contents.includes(symbol))
          .map((symbol) => `${relative(root, file)}: ${symbol}`);
      });

    expect(references).toEqual([]);
  });
});
