import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkDeadCode } from "./dead-code-check.mjs";

const temporary = [];

/**
 * Crea un workspace mínimo para las pruebas del checker.
 * @returns La raíz temporal.
 */
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aula-dead-"));
  temporary.push(root);
  writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "fixture",
    dependencies: { "unused-package": "1.0.0" },
  }, null, 2));
  mkdirSync(path.join(root, "docs"), { recursive: true });
  writeFileSync(path.join(root, "docs", "scope.json"), JSON.stringify({
    scope: ["app/board/**", "lib/**", "app/**/*.css"],
  }, null, 2));
  writeFileSync(path.join(root, "docs", "dead.json"), JSON.stringify({
    version: 1,
    scopeSource: "docs/scope.json",
    publicModules: [{ path: "lib/public.ts", reason: "API pública de prueba." }],
    testOnlyModules: [],
    unusedExports: [],
    dependencyExceptions: [],
    undeclaredImportExceptions: [],
    cssExceptions: [],
  }, null, 2));
  mkdirSync(path.join(root, "app", "board"), { recursive: true });
  mkdirSync(path.join(root, "lib"), { recursive: true });
  return root;
}

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("dead code check", () => {
  it("pasa sobre la línea base real", { timeout: 20_000 }, () => {
    const result = checkDeadCode({ root: process.cwd(), baselinePath: "docs/developing/dead-code-baseline.json" });
    expect(result.ok).toBe(true);
    expect(result.totals.modules).toBe(0);
    expect(result.totals.unusedDependencies).toBe(0);
  });

  it("detecta módulos, exports, dependencias, imports y CSS sin consumidores", () => {
    const root = fixture();
    writeFileSync(path.join(root, "app", "board", "page.tsx"), [
      "import { used } from \"./live\";",
      "import \"./bad-dep\";",
      "import \"./styles.css\";",
      "export default function Page() { return used; }",
    ].join("\n"));
    writeFileSync(path.join(root, "app", "board", "live.ts"), "export const used = 1;\nexport const unused = 2;\n");
    writeFileSync(path.join(root, "app", "board", "orphan.ts"), "export const orphan = 1;\n");
    writeFileSync(path.join(root, "app", "board", "only-test.ts"), "export const tested = 1;\n");
    writeFileSync(path.join(root, "app", "board", "only-test.test.ts"), "import { tested } from \"./only-test\";\nvoid tested;\n");
    writeFileSync(path.join(root, "app", "board", "bad-dep.ts"), "import \"left-pad\";\n");
    writeFileSync(path.join(root, "app", "board", "styles.css"), ".ok { color: green; }\n");
    writeFileSync(path.join(root, "app", "board", "dead.css"), ".dead { color: red; }\n");
    writeFileSync(path.join(root, "lib", "public.ts"), "export const api = 1;\n");

    const result = checkDeadCode({ root, workspace: root, baselinePath: "docs/dead.json" });
    const kinds = new Set(result.problems.map((problem) => problem.kind));

    expect(result.ok).toBe(false);
    expect(kinds).toEqual(new Set([
      "dead-module",
      "test-only-module",
      "unused-export",
      "unused-dependency",
      "undeclared-import",
      "dead-css",
    ]));
    expect(result.problems.some((problem) => problem.path === "app/board/orphan.ts")).toBe(true);
    expect(result.problems.some((problem) => problem.path === "app/board/live.ts" && problem.name === "unused")).toBe(true);
    expect(result.problems.some((problem) => problem.name === "unused-package")).toBe(true);
    expect(result.problems.some((problem) => problem.name === "left-pad")).toBe(true);
    expect(result.problems.some((problem) => problem.path === "app/board/dead.css")).toBe(true);
  });

  it("respeta las excepciones del baseline", () => {
    const root = fixture();
    writeFileSync(path.join(root, "app", "board", "page.tsx"), "import { used } from \"./live\";\nexport default function Page() { return used; }\n");
    writeFileSync(path.join(root, "app", "board", "live.ts"), "export const used = 1;\nexport const unused = 2;\n");
    writeFileSync(path.join(root, "docs", "dead.json"), JSON.stringify({
      version: 1,
      scopeSource: "docs/scope.json",
      publicModules: [],
      testOnlyModules: [],
      unusedExports: ["app/board/live.ts:unused"],
      dependencyExceptions: [{ name: "unused-package" }],
      undeclaredImportExceptions: [],
      cssExceptions: [],
    }, null, 2));

    const result = checkDeadCode({ root, workspace: root, baselinePath: "docs/dead.json" });
    expect(result.ok).toBe(true);
    expect(result.totals.unusedExports).toBe(0);
    expect(result.totals.unusedDependencies).toBe(0);
  });

  it("falla cerrada si la raíz está fuera del workspace", () => {
    const root = fixture();
    const workspace = path.join(root, "workspace");
    mkdirSync(workspace, { recursive: true });
    expect(() => checkDeadCode({ root, workspace })).toThrow(/fuera del workspace/);
  });
});
