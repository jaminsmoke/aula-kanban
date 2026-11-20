import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkArchitecture } from "./architecture-check.mjs";

const temporary = [];
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aula-arch-"));
  temporary.push(root);
  writeFileSync(path.join(root, "package.json"), "{\"name\":\"fixture\"}\n");
  mkdirSync(path.join(root, "app", "board", "apps"), { recursive: true });
  mkdirSync(path.join(root, "app", "board", "shared"), { recursive: true });
  mkdirSync(path.join(root, "lib", "server"), { recursive: true });
  mkdirSync(path.join(root, "docs"), { recursive: true });
  writeFileSync(path.join(root, "docs", "baseline.json"), JSON.stringify({
    scope: ["app/board/**", "lib/**", "app/**/*.css"],
    limits: { shell: 450, componentOrHook: 600, css: 500, test: 600 },
    layers: {
      shell: ["app/board.tsx"],
      apps: ["app/board/apps/**"],
      shared: ["app/board/shared/**"],
      server: ["lib/server/**"],
      domain: ["lib/domain/**"],
      api: ["app/api/**"],
      infrastructure: ["db/**"],
    },
    allowedEdges: [],
    baselineViolations: [],
    baselineCycles: [],
  }, null, 2));
  return root;
}

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("architecture check", () => {
  it("pasa sobre la línea base real", () => {
    const result = checkArchitecture({ root: process.cwd(), baselinePath: "docs/developing/arch-baseline.json" });
    expect(result.ok).toBe(true);
    expect(result.totals.unexpectedViolations).toBe(0);
    expect(result.totals.unexpectedCycles).toBe(0);
    expect(result.totals.budgetProblems).toBe(0);
  });

  it("detecta imports prohibidos, ciclos y presupuesto", () => {
    const root = fixture();
    writeFileSync(path.join(root, "app", "board", "apps", "ok.ts"), "export const ok = true;\n");
    writeFileSync(path.join(root, "app", "board", "shared", "bad.ts"), "import { ok } from '../apps/ok';\nexport const bad = ok;\n");
    writeFileSync(path.join(root, "lib", "server", "a.ts"), "import './b';\nexport const a = true;\n");
    writeFileSync(path.join(root, "lib", "server", "b.ts"), "import './a';\nexport const b = true;\n");
    writeFileSync(path.join(root, "app", "board", "large.css"), `${".x{color:red;}\n".repeat(501)}`);

    const result = checkArchitecture({ root, workspace: root, baselinePath: "docs/baseline.json" });
    expect(result.ok).toBe(false);
    expect(result.violations.some((entry) => entry.rule === "shared-apps")).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.budgetProblems.some((entry) => entry.path === "app/board/large.css")).toBe(true);
  });

  it("detecta una raíz MCP externa en la configuración del proyecto", () => {
    const root = fixture();
    mkdirSync(path.join(root, ".opencode"), { recursive: true });
    writeFileSync(path.join(root, ".opencode", "opencode.json"), JSON.stringify({
      mcp: {
        codarch: {
          type: "local",
          command: ["node", "external-codarch.mjs", "--root", "../otro-repositorio"],
        },
      },
    }, null, 2));

    const result = checkArchitecture({ root, workspace: root, baselinePath: "docs/baseline.json" });
    expect(result.ok).toBe(false);
    expect(result.mcpProblems.some((entry) => entry.label === "--root")).toBe(true);
  });

  it("acepta una configuración MCP relativa al workspace", () => {
    const root = fixture();
    mkdirSync(path.join(root, ".opencode"), { recursive: true });
    writeFileSync(path.join(root, ".opencode", "opencode.json"), JSON.stringify({
      mcp: { local: { type: "local", command: ["node", "./scripts/mcp.mjs", "--root", "."] } },
    }, null, 2));

    const result = checkArchitecture({ root, workspace: root, baselinePath: "docs/baseline.json" });
    expect(result.mcpProblems).toEqual([]);
  });

  it("rechaza un comando MCP con ruta absoluta externa", () => {
    const root = fixture();
    writeFileSync(path.join(root, "opencode.json"), JSON.stringify({
      mcp: { local: { type: "local", command: ["node", "C:/otro/repositorio/mcp.mjs"] } },
    }, null, 2));

    const result = checkArchitecture({ root, workspace: root, baselinePath: "docs/baseline.json" });
    expect(result.mcpProblems.some((entry) => entry.label === "command")).toBe(true);
  });

  it("rechaza una configuración MCP con JSON inválido", () => {
    const root = fixture();
    writeFileSync(path.join(root, "opencode.json"), "{ no es json");

    const result = checkArchitecture({ root, workspace: root, baselinePath: "docs/baseline.json" });
    expect(result.mcpProblems.some((entry) => entry.label === "json")).toBe(true);
  });

  it("falla cerrada si la raíz está fuera del workspace", () => {
    const root = fixture();
    const workspace = path.join(root, "workspace");
    mkdirSync(workspace, { recursive: true });
    expect(() => checkArchitecture({ root, workspace })).toThrow(/fuera del workspace/);
  });
});
