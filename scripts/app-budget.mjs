import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ROOT = process.cwd();
const DEFAULT_BUDGET = "docs/perf-budget.json";
const IGNORED_DIRS = new Set(["node_modules", "dist", ".next", ".vinext", ".git", ".sites-runtime", ".wrangler", ".freebuff", "outputs", "examples"]);

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
 * Enumera archivos del workspace.
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
 * Cuenta líneas no vacías.
 * @param file - Archivo absoluto.
 * @returns Número de líneas con contenido.
 */
function countLines(file) {
  return readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

/**
 * Calcula las métricas de pruebas y CSS de una app.
 * @param root - Raíz absoluta.
 * @param files - Archivos del workspace.
 * @param paths - Patrones de la app.
 * @returns Métricas de pruebas y CSS.
 */
function appMetrics(root, files, paths) {
  const patterns = paths.map(globToRegExp);
  const belongs = (file) => {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    return patterns.some((pattern) => pattern.test(relative));
  };
  const tests = files.filter((file) => belongs(file) && /\.(test|spec)\.(ts|tsx)$/.test(file));
  const css = files.filter((file) => belongs(file) && file.endsWith(".css"));
  return {
    tests: {
      files: tests.length,
      lines: tests.reduce((total, file) => total + countLines(file), 0),
    },
    css: {
      files: css.length,
      lines: css.reduce((total, file) => total + countLines(file), 0),
    },
  };
}

/**
 * Devuelve la mediana de una lista de números.
 * @param values - Valores.
 * @returns Mediana.
 */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Comprueba las métricas de una app contra su presupuesto.
 * @param id - Identificador de la app.
 * @param metrics - Métricas calculadas.
 * @param budget - Presupuesto de la app.
 * @param failures - Lista donde acumular errores.
 */
function checkApp(id, metrics, budget, failures) {
  for (const section of ["tests", "css"]) {
    const limits = budget[section];
    const current = metrics[section];
    if (!limits || !Number.isInteger(limits.maxFiles) || !Number.isInteger(limits.maxLines)) {
      failures.push(`${id}: falta el presupuesto de ${section}.`);
      continue;
    }
    if (current.files > limits.maxFiles) failures.push(`${id}: ${section} ${current.files} archivos > ${limits.maxFiles}.`);
    if (current.lines > limits.maxLines) failures.push(`${id}: ${section} ${current.lines} líneas > ${limits.maxLines}.`);
  }
}

/**
 * Comprueba la latencia registrada.
 * @param root - Raíz absoluta.
 * @param config - Configuración de latencia.
 * @param failures - Lista donde acumular errores.
 * @returns Resumen por modo.
 */
function checkLatency(root, config, failures) {
  if (!config) return [];
  const source = path.resolve(root, config.source ?? "docs/perf-latency.json");
  const report = JSON.parse(readFileSync(source, "utf8"));
  const rows = [];
  for (const [mode, limits] of Object.entries(config.limits ?? {})) {
    const summary = report.summary?.[mode];
    if (!summary) {
      failures.push(`latencia: falta el modo ${mode}.`);
      continue;
    }
    for (const [key, max] of [
      ["medianOpenMs", limits.maxOpenMs],
      ["medianEvalMs", limits.maxEvalMs],
      ["medianTotalMs", limits.maxTotalMs],
    ]) {
      if (!Number.isFinite(max)) continue;
      const value = summary[key];
      if (!Number.isFinite(value)) failures.push(`latencia ${mode}: falta ${key}.`);
      else if (value > max) failures.push(`latencia ${mode}: ${key} ${value} ms > ${max} ms.`);
    }
    if (typeof limits.engineLoaded === "boolean" && summary.engineLoaded !== limits.engineLoaded) {
      failures.push(`latencia ${mode}: engineLoaded=${summary.engineLoaded}, esperado ${limits.engineLoaded}.`);
    }
    rows.push({ mode, summary, limits });
  }
  return rows;
}

/**
 * Comprueba las imágenes registradas.
 * @param root - Raíz absoluta.
 * @param config - Configuración de imágenes.
 * @param failures - Lista donde acumular errores.
 * @returns Resumen por escenario.
 */
function checkImages(root, config, failures) {
  if (!config) return [];
  const source = path.resolve(root, config.source ?? "docs/image-baseline.json");
  const report = JSON.parse(readFileSync(source, "utf8"));
  const scenarios = new Map(
    (report.scenarios ?? []).map((scenario) => [`${scenario.id}@${scenario.targetWidth}`, scenario]),
  );
  const rows = [];
  for (const [key, limits] of Object.entries(config.limits ?? {})) {
    const scenario = scenarios.get(key);
    if (!scenario?.samples?.length) {
      failures.push(`imagen: falta el escenario ${key}.`);
      continue;
    }
    const derivativeBytes = median(scenario.samples.map((sample) => sample.derivativeBytes));
    const psnrDb = median(scenario.samples.map((sample) => sample.psnrDb));
    if (Number.isFinite(limits.maxDerivativeBytes) && derivativeBytes > limits.maxDerivativeBytes) {
      failures.push(`imagen ${key}: ${derivativeBytes} B > ${limits.maxDerivativeBytes} B.`);
    }
    if (Number.isFinite(limits.minPsnrDb) && psnrDb < limits.minPsnrDb) {
      failures.push(`imagen ${key}: PSNR ${psnrDb.toFixed(2)} dB < ${limits.minPsnrDb} dB.`);
    }
    rows.push({ key, derivativeBytes, psnrDb, limits });
  }
  return rows;
}

/**
 * Ejecuta la comprobación de presupuestos por app.
 * @param options - Raíz y baseline.
 * @returns Informe estructurado.
 */
export function checkAppBudget({ root = DEFAULT_ROOT, budgetPath = DEFAULT_BUDGET } = {}) {
  const resolvedRoot = path.resolve(root);
  const budget = JSON.parse(readFileSync(path.resolve(resolvedRoot, budgetPath), "utf8"));
  const files = listFiles(resolvedRoot);
  const failures = [];
  const apps = [];

  for (const [id, config] of Object.entries(budget.apps ?? {})) {
    if (!Array.isArray(config.paths) || config.paths.length === 0) {
      failures.push(`${id}: falta paths.`);
      continue;
    }
    const flowBudgets = (config.flows ?? []).map((flowId) => budget.flows?.[flowId]);
    if (flowBudgets.some((limit) => !Number.isInteger(limit))) {
      failures.push(`${id}: algún flujo no tiene presupuesto.`);
    }
    const maxFlowLimit = Math.max(0, ...flowBudgets.filter(Number.isInteger));
    if (!Number.isInteger(config.gzip)) failures.push(`${id}: falta el presupuesto gzip de la app.`);
    else if (maxFlowLimit > config.gzip) failures.push(`${id}: el presupuesto de la app es menor que el de su flujo mayor (${maxFlowLimit} B).`);
    const metrics = appMetrics(resolvedRoot, files, config.paths);
    checkApp(id, metrics, config, failures);
    apps.push({ id, label: config.label ?? id, flows: config.flows ?? [], ...metrics, limits: config });
  }

  for (const id of Object.keys(budget.flows ?? {})) {
    if (!apps.some((app) => app.flows.includes(id))) failures.push(`${id}: flujo sin app asignada.`);
  }

  const latency = checkLatency(resolvedRoot, budget.latency, failures);
  const images = checkImages(resolvedRoot, budget.images, failures);

  return {
    ok: failures.length === 0,
    root: resolvedRoot,
    apps,
    latency,
    images,
    failures,
    totals: {
      apps: apps.length,
      testFiles: apps.reduce((total, app) => total + app.tests.files, 0),
      testLines: apps.reduce((total, app) => total + app.tests.lines, 0),
      cssFiles: apps.reduce((total, app) => total + app.css.files, 0),
      cssLines: apps.reduce((total, app) => total + app.css.lines, 0),
      latencyModes: latency.length,
      imageScenarios: images.length,
    },
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
  const root = rootArgIndex >= 0 ? args[rootArgIndex + 1] : DEFAULT_ROOT;
  try {
    const result = checkAppBudget({ root });
    if (json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      for (const app of result.apps) {
        process.stdout.write(
          `${app.id.padEnd(18)} tests ${String(app.tests.files).padStart(3)}/${String(app.tests.lines).padStart(5)}`
          + ` <= ${String(app.limits.tests.maxFiles).padStart(3)}/${String(app.limits.tests.maxLines).padStart(5)}`
          + `  css ${String(app.css.files).padStart(2)}/${String(app.css.lines).padStart(4)}`
          + ` <= ${String(app.limits.css.maxFiles).padStart(2)}/${String(app.limits.css.maxLines).padStart(4)}\n`,
        );
      }
      for (const row of result.latency) {
        process.stdout.write(
          `latencia ${row.mode.padEnd(10)} total ${row.summary.medianTotalMs.toFixed(1)} ms`
          + ` <= ${row.limits.maxTotalMs} ms\n`,
        );
      }
      for (const row of result.images) {
        process.stdout.write(
          `imagen ${row.key.padEnd(16)} ${Math.round(row.derivativeBytes)} B`
          + ` <= ${row.limits.maxDerivativeBytes} B, PSNR ${row.psnrDb.toFixed(1)} dB\n`,
        );
      }
      if (result.failures.length) {
        process.stderr.write(`\nPresupuesto por app incumplido:\n- ${result.failures.join("\n- ")}\n`);
      } else {
        process.stdout.write("\nPresupuesto por app correcto.\n");
      }
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
