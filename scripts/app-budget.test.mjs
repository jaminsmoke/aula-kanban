import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkAppBudget } from "./app-budget.mjs";

const temporary = [];

/**
 * Crea un workspace mínimo con una app y su presupuesto.
 * @returns La raíz temporal.
 */
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aula-app-budget-"));
  temporary.push(root);
  mkdirSync(path.join(root, "app", "demo"), { recursive: true });
  mkdirSync(path.join(root, "docs"), { recursive: true });
  writeFileSync(path.join(root, "docs", "perf-budget.json"), JSON.stringify({
    version: 2,
    unit: "bytes",
    margin: 0.05,
    apps: {
      demo: {
        label: "Demo",
        paths: ["app/demo/**"],
        flows: ["demo"],
        gzip: 1000,
        tests: { maxFiles: 1, maxLines: 10 },
        css: { maxFiles: 1, maxLines: 5 },
      },
    },
    flows: { demo: 1000 },
    latency: {
      source: "docs/latency.json",
      limits: { basica: { maxOpenMs: 100, maxEvalMs: 100, maxTotalMs: 200, engineLoaded: false } },
    },
    images: {
      source: "docs/images.json",
      limits: { "demo@800": { maxDerivativeBytes: 1000, minPsnrDb: 35 } },
    },
  }, null, 2));
  writeFileSync(path.join(root, "docs", "latency.json"), JSON.stringify({
    summary: {
      basica: { medianOpenMs: 50, medianEvalMs: 50, medianTotalMs: 100, engineLoaded: false },
    },
  }, null, 2));
  writeFileSync(path.join(root, "docs", "images.json"), JSON.stringify({
    scenarios: [{
      id: "demo",
      targetWidth: 800,
      samples: [
        { derivativeBytes: 900, psnrDb: 36 },
        { derivativeBytes: 800, psnrDb: 37 },
      ],
    }],
  }, null, 2));
  writeFileSync(path.join(root, "app", "demo", "demo.test.ts"), "import { it } from \"vitest\";\nit(\"demo\", () => {});\n");
  writeFileSync(path.join(root, "app", "demo", "style.css"), ".demo { color: red; }\n");
  return root;
}

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("app budget", () => {
  it("pasa sobre el presupuesto real", () => {
    const result = checkAppBudget();
    expect(result.ok).toBe(true);
    expect(result.totals.apps).toBeGreaterThanOrEqual(7);
    expect(result.totals.latencyModes).toBeGreaterThan(0);
    expect(result.totals.imageScenarios).toBeGreaterThan(0);
  });

  it("acepta una app dentro de test, CSS, latencia e imagen", () => {
    const root = fixture();
    const result = checkAppBudget({ root });
    expect(result.ok).toBe(true);
    expect(result.apps[0].tests.files).toBe(1);
    expect(result.apps[0].css.lines).toBe(1);
  });

  it("falla si una regresión supera el presupuesto de pruebas", () => {
    const root = fixture();
    writeFileSync(path.join(root, "app", "demo", "demo.test.ts"), "import { it } from \"vitest\";\n".repeat(12));
    const result = checkAppBudget({ root });
    expect(result.ok).toBe(false);
    expect(result.failures.some((failure) => failure.includes("demo: tests 12 líneas > 10"))).toBe(true);
  });

  it("falla si un flujo no tiene app asignada", () => {
    const root = fixture();
    const budgetPath = path.join(root, "docs", "perf-budget.json");
    const budget = JSON.parse(JSON.stringify({
      version: 2,
      apps: {
        demo: {
          paths: ["app/demo/**"],
          flows: ["demo"],
          gzip: 1000,
          tests: { maxFiles: 1, maxLines: 10 },
          css: { maxFiles: 1, maxLines: 5 },
        },
      },
      flows: { demo: 1000, otro: 1000 },
    }));
    writeFileSync(budgetPath, JSON.stringify(budget, null, 2));
    const result = checkAppBudget({ root });
    expect(result.ok).toBe(false);
    expect(result.failures).toContain("otro: flujo sin app asignada.");
  });
});
