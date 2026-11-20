import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_BASELINE = "docs/developing/arch-baseline.json";
const IGNORED_DIRS = new Set(["node_modules", "dist", ".next", ".vinext", ".git", ".sites-runtime", ".wrangler", ".freebuff", "outputs"]);

/**
 * Convierte un patrón de ruta con `*` y `**` en expresión regular.
 * @param pattern - Patrón relativo al workspace.
 * @returns Expresión regular anclada.
 */
function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\/|\*\*|\*/g, (token) => (
      token === "**/" ? "(?:.*/)?" : token === "**" ? ".*" : "[^/]*"
    ));
  return new RegExp(`^${escaped}$`);
}

/**
 * Comprueba si una ruta relativa coincide con un patrón.
 * @param relativePath - Ruta con barras normales.
 * @param pattern - Patrón del baseline.
 * @returns `true` si coincide.
 */
function matches(relativePath, pattern) {
  return globToRegExp(pattern).test(relativePath);
}

/**
 * Cuenta líneas físicas de un archivo.
 * @param text - Contenido.
 * @returns Número de líneas.
 */
function countLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

/**
 * Clasifica una ruta según las capas del baseline.
 * @param relativePath - Ruta con barras normales.
 * @param layers - Patrones por capa.
 * @returns La capa o `other`.
 */
export function classifyLayer(relativePath, layers) {
  for (const [layer, patterns] of Object.entries(layers)) {
    if (patterns.some((pattern) => matches(relativePath, pattern))) return layer;
  }
  return "other";
}

/**
 * Enumera archivos dentro del workspace.
 * @param root - Raíz absoluta.
 * @returns Rutas absolutas.
 */
function listFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk(root);
  return files;
}

/**
 * Resuelve un import relativo.
 * @param from - Archivo origen absoluto.
 * @param spec - Especificador importado.
 * @returns La ruta resuelta o `null`.
 */
function resolveImport(from, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Extrae imports estáticos y dinámicos relativos de un archivo.
 * @param text - Contenido.
 * @returns Especificadores importados.
 */
function importSpecs(text) {
  const specs = new Set();
  for (const match of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)) {
    specs.add(match[1]);
  }
  return [...specs];
}

/**
 * Normaliza un ciclo para compararlo con el baseline.
 * @param cycle - Nodos del ciclo.
 * @returns Clave estable.
 */
function cycleKey(cycle) {
  return [...new Set(cycle)].sort().join("|");
}

/**
 * Comprueba que las configuraciones MCP del proyecto no fijan raíces externas.
 * @param root - Raíz absoluta del workspace.
 * @returns Problemas encontrados.
 */
function checkProjectMcpConfig(root) {
  const candidates = [
    "opencode.json",
    ".opencode/opencode.json",
    ".mcp.json",
    ".cursor/mcp.json",
  ];
  const problems = [];
  const looksLikePath = (value) => (
    /^[A-Za-z]:[\\/]/.test(value)
    || /^\\\\/.test(value)
    || value.startsWith("/")
    || value.startsWith("file://")
    || /^\.\.[\\/]/.test(value)
    || value.split(/[\\/]/).includes("..")
  );
  const checkPath = (value, file, label) => {
    if (typeof value !== "string" || !value.trim()) return;
    let candidate = value;
    if (candidate.startsWith("file://")) {
      try {
        candidate = decodeURIComponent(new URL(candidate).pathname);
      } catch {
        problems.push({ file, label, value, message: "La ruta MCP no es una URL de archivo válida." });
        return;
      }
    }
    const resolved = path.resolve(root, candidate);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      problems.push({ file, label, value, message: "La configuración MCP apunta fuera del workspace." });
    }
  };
  const checkCommand = (value, file, label) => {
    if (typeof value !== "string" || !looksLikePath(value)) return;
    checkPath(value, file, label);
  };
  const visit = (value, file, parentKey = "") => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] === "--root" && typeof value[index + 1] === "string") {
          checkPath(value[index + 1], file, "--root");
        }
        if (parentKey === "command" || parentKey === "args") checkCommand(value[index], file, parentKey);
        visit(value[index], file, parentKey);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if ((key === "root" || key === "cwd") && typeof child === "string") checkPath(child, file, key);
      if (key === "command" && typeof child === "string") checkCommand(child, file, key);
      visit(child, file, key);
    }
  };
  for (const candidate of candidates) {
    const file = path.join(root, candidate);
    if (!existsSync(file)) continue;
    try {
      visit(JSON.parse(readFileSync(file, "utf8")), candidate);
    } catch {
      problems.push({ file: candidate, label: "json", value: candidate, message: "La configuración MCP no es JSON válido." });
    }
  }
  return problems;
}

/**
 * Ejecuta la comprobación de arquitectura.
 * @param options - Raíz, baseline y workspace.
 * @returns Informe estructurado.
 */
export function checkArchitecture({ root, baselinePath = DEFAULT_BASELINE, workspace = process.cwd() }) {
  const resolvedRoot = path.resolve(workspace, root ?? ".");
  const relativeRoot = path.relative(path.resolve(workspace), resolvedRoot);
  if (relativeRoot.startsWith("..") || path.isAbsolute(relativeRoot)) {
    throw new Error("La raíz de arquitectura está fuera del workspace. La comprobación falla cerrada.");
  }
  if (!existsSync(path.join(resolvedRoot, "package.json"))) {
    throw new Error(`La raíz ${resolvedRoot} no parece un workspace de Aula Kanban.`);
  }
  const resolvedBaseline = path.resolve(resolvedRoot, baselinePath);
  const relativeBaseline = path.relative(resolvedRoot, resolvedBaseline);
  if (relativeBaseline.startsWith("..") || path.isAbsolute(relativeBaseline)) {
    throw new Error("El baseline está fuera del workspace. La comprobación falla cerrada.");
  }
  const baseline = JSON.parse(readFileSync(resolvedBaseline, "utf8"));
  const allFiles = listFiles(resolvedRoot);
  const isTest = (file) => /\.(test|spec)\.(ts|tsx)$/.test(file);
  const scoped = allFiles.filter((file) => {
    const relative = path.relative(resolvedRoot, file).replaceAll("\\", "/");
    return baseline.scope.some((pattern) => matches(relative, pattern));
  });
  const productFiles = scoped.filter((file) => /\.(ts|tsx)$/.test(file) && !isTest(file));
  const productSet = new Set(productFiles);
  const layerOf = (file) => classifyLayer(path.relative(resolvedRoot, file).replaceAll("\\", "/"), baseline.layers);
  const edges = [];
  const violations = [];

  for (const file of productFiles) {
    const relative = path.relative(resolvedRoot, file).replaceAll("\\", "/");
    const text = readFileSync(file, "utf8");
    for (const spec of importSpecs(text)) {
      if (layerOf(file) === "domain" && /^(react|react-dom|next|@tiptap\/react)$/.test(spec)) {
        violations.push({ rule: "domain-react", from: relative, to: spec, message: "El dominio no puede depender de React o Next." });
        continue;
      }
      const target = resolveImport(file, spec);
      if (!target) continue;
      const relativeTarget = path.relative(resolvedRoot, target).replaceAll("\\", "/");
      if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
        violations.push({ rule: "outside-workspace", from: relative, to: relativeTarget, message: "Un import sale del workspace." });
        continue;
      }
      if (!productSet.has(target) || target.endsWith(".css")) continue;
      edges.push({ from: relative, to: relativeTarget, fromLayer: layerOf(file), toLayer: layerOf(target) });
    }
  }

  const allowedFeatureAppTargets = new Set(
    baseline.allowedEdges
      .filter((edge) => edge.from === "features" && edge.to === "apps")
      .flatMap((edge) => edge.targets ?? []),
  );
  const allowedInfrastructure = new Set(["server", "api"]);
  const forbidden = (edge) => {
    if (edge.fromLayer === "features" && edge.toLayer === "apps") return !allowedFeatureAppTargets.has(edge.to) ? "features-apps" : null;
    if (edge.toLayer === "infrastructure" && allowedInfrastructure.has(edge.fromLayer)) return null;
    const rules = {
      "shared-apps": ["shared", ["apps", "features", "shell", "api", "other"]],
      "domain-external": ["domain", ["apps", "features", "shell", "api", "server", "other"]],
      "server-app": ["server", ["apps", "features", "shell", "api", "other"]],
      "infrastructure-ui": ["infrastructure", ["apps", "features", "shell", "api", "other"]],
      "api-ui": ["api", ["apps", "features", "shell", "shared", "other"]],
      "apps-shell-feature": ["apps", ["features", "shell", "other"]],
      "features-shell": ["features", ["shell", "other"]],
    };
    for (const [rule, [from, targets]] of Object.entries(rules)) {
      if (edge.fromLayer === from && targets.includes(edge.toLayer)) return rule;
    }
    return null;
  };
  for (const edge of edges) {
    const rule = forbidden(edge);
    if (rule) violations.push({ ...edge, rule, message: "Import prohibido entre capas." });
  }
  const baselineViolations = new Set((baseline.baselineViolations ?? []).map((entry) => `${entry.rule}:${entry.from}->${entry.to}`));
  const unexpectedViolations = violations.filter((entry) => !baselineViolations.has(`${entry.rule}:${entry.from}->${entry.to}`));

  const graph = new Map();
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from).push(edge.to);
  }
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const dfs = (node) => {
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      if (index >= 0) cycles.push(stack.slice(index).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of graph.keys()) dfs(node);
  const baselineCycles = new Set((baseline.baselineCycles ?? []).map((entry) => cycleKey(entry.path)));
  const unexpectedCycles = cycles.filter((cycle) => !baselineCycles.has(cycleKey(cycle)));

  const budgetEntries = new Map();
  for (const entry of baseline.largeFiles ?? []) budgetEntries.set(entry.path, { ...entry, kind: "code" });
  for (const entry of baseline.largeCss ?? []) budgetEntries.set(entry.path, { ...entry, kind: "css" });
  const budgetProblems = [];
  for (const file of scoped) {
    const relative = path.relative(resolvedRoot, file).replaceAll("\\", "/");
    const text = readFileSync(file, "utf8");
    const lines = countLines(text);
    const isCss = file.endsWith(".css");
    const isTestFile = isTest(file);
    const limit = isCss
      ? baseline.limits.css
      : isTestFile
        ? baseline.limits.test
        : relative === "app/board.tsx"
          ? baseline.limits.shell
          : baseline.limits.componentOrHook;
    const exception = budgetEntries.get(relative);
    if (lines > limit && !exception) budgetProblems.push({ path: relative, lines, limit, kind: isCss ? "css" : isTestFile ? "test" : "code" });
    if (exception && lines > exception.lines && lines > limit) {
      budgetProblems.push({ path: relative, lines, limit: exception.lines, kind: "baseline-growth" });
    }
  }

  const mcpProblems = checkProjectMcpConfig(resolvedRoot);

  return {
    ok: unexpectedViolations.length === 0 && unexpectedCycles.length === 0 && budgetProblems.length === 0 && mcpProblems.length === 0,
    root: resolvedRoot,
    totals: {
      files: scoped.length,
      productFiles: productFiles.length,
      edges: edges.length,
      violations: violations.length,
      unexpectedViolations: unexpectedViolations.length,
      cycles: cycles.length,
      unexpectedCycles: unexpectedCycles.length,
      budgetProblems: budgetProblems.length,
      mcpProblems: mcpProblems.length,
    },
    violations: unexpectedViolations,
    baselineViolations: violations.filter((entry) => baselineViolations.has(`${entry.rule}:${entry.from}->${entry.to}`)),
    cycles: unexpectedCycles,
    baselineCycles: cycles.filter((cycle) => baselineCycles.has(cycleKey(cycle))),
    budgetProblems,
    mcpProblems,
  };
}

/**
 * Ejecuta el checker desde la línea de comandos.
 * @returns Código de salida.
 */
function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const rootArgIndex = args.indexOf("--root");
  const root = rootArgIndex >= 0 ? args[rootArgIndex + 1] : ".";
  try {
    const result = checkArchitecture({ root });
    if (json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(
        `Arquitectura: ${result.totals.productFiles} archivos de producto, ${result.totals.edges} imports, `
        + `${result.totals.unexpectedViolations} violaciones nuevas, ${result.totals.unexpectedCycles} ciclos nuevos, `
        + `${result.totals.budgetProblems} problemas de presupuesto, ${result.totals.mcpProblems} problemas MCP.\n`,
      );
      for (const entry of result.violations) {
        process.stderr.write(`ERROR ${entry.rule}: ${entry.from} -> ${entry.to}\n`);
      }
      for (const cycle of result.cycles) {
        process.stderr.write(`ERROR ciclo: ${cycle.join(" -> ")}\n`);
      }
      for (const entry of result.budgetProblems) {
        process.stderr.write(`ERROR presupuesto ${entry.kind}: ${entry.path} (${entry.lines} > ${entry.limit})\n`);
      }
      for (const entry of result.mcpProblems) {
        process.stderr.write(`ERROR MCP ${entry.file} ${entry.label}: ${entry.value} (${entry.message})\n`);
      }
      if (!result.ok) process.stderr.write("Arquitectura incorrecta.\n");
      else process.stdout.write("Arquitectura correcta.\n");
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) process.stdout.write(`${JSON.stringify({ ok: false, error: message }, null, 2)}\n`);
    else process.stderr.write(`ERROR: ${message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
