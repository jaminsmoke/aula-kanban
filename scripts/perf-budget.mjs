import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const { stdout } = await run(process.execPath, ["scripts/perf-report.mjs", "--json"], {
  cwd: root,
  maxBuffer: 10 * 1024 * 1024,
});
const report = JSON.parse(stdout);
const budget = JSON.parse(await readFile(new URL("../docs/perf-budget.json", import.meta.url), "utf8"));

const failures = [];
const flows = new Map(report.flows.map((flow) => [flow.id, flow]));

for (const flow of report.flows) {
  const limit = budget.flows?.[flow.id];
  if (!Number.isInteger(limit)) {
    failures.push(`${flow.id}: falta el presupuesto.`);
    continue;
  }
  if (flow.gzip > limit) failures.push(`${flow.id}: ${flow.gzip} B gzip > ${limit} B.`);
  const files = flow.files.map((file) => file.file).join("\n");
  for (const forbidden of budget.forbidden?.[flow.id] ?? []) {
    if (files.includes(forbidden)) failures.push(`${flow.id}: incluye ${forbidden}.`);
  }
  for (const required of budget.required?.[flow.id] ?? []) {
    if (!files.includes(required)) failures.push(`${flow.id}: falta ${required}.`);
  }
}

for (const id of Object.keys(budget.flows ?? {})) {
  if (!flows.has(id)) failures.push(`${id}: presupuesto sin flujo en el informe.`);
}

const apps = Object.entries(budget.apps ?? {});
if (!apps.length) failures.push("faltan los presupuestos por app.");
for (const [id, app] of apps) {
  if (!Array.isArray(app.flows) || app.flows.length === 0) {
    failures.push(`${id}: falta la lista de flujos.`);
    continue;
  }
  let actual = 0;
  let maxFlowLimit = 0;
  for (const flowId of app.flows) {
    const flow = flows.get(flowId);
    const limit = budget.flows?.[flowId];
    if (!flow) {
      failures.push(`${id}: el flujo ${flowId} no existe en el informe.`);
      continue;
    }
    if (!Number.isInteger(limit)) {
      failures.push(`${id}: el flujo ${flowId} no tiene presupuesto.`);
      continue;
    }
    actual = Math.max(actual, flow.gzip);
    maxFlowLimit = Math.max(maxFlowLimit, limit);
  }
  if (!Number.isInteger(app.gzip)) failures.push(`${id}: falta el presupuesto gzip de la app.`);
  else {
    if (actual > app.gzip) failures.push(`${id}: ${actual} B gzip > ${app.gzip} B (app).`);
    if (maxFlowLimit > app.gzip) failures.push(`${id}: el presupuesto de la app es menor que el de su flujo mayor (${maxFlowLimit} B).`);
  }
}
for (const id of Object.keys(budget.flows ?? {})) {
  if (!apps.some(([, app]) => Array.isArray(app.flows) && app.flows.includes(id))) {
    failures.push(`${id}: flujo sin app asignada.`);
  }
}

const rows = report.flows.map((flow) => {
  const limit = budget.flows?.[flow.id];
  return `${flow.id.padEnd(18)} ${String(flow.gzip).padStart(9)} B gzip / ${String(limit).padStart(9)} B`;
});
const appRows = apps.map(([id, app]) => {
  const values = (app.flows ?? []).map((flowId) => flows.get(flowId)?.gzip).filter(Number.isFinite);
  const actual = values.length ? Math.max(...values) : 0;
  return `${id.padEnd(18)} ${String(actual).padStart(9)} B gzip / ${String(app.gzip).padStart(9)} B (${(app.flows ?? []).length} flujos)`;
});
process.stdout.write(`${rows.join("\n")}\n\nPor app:\n${appRows.join("\n")}\n`);
if (failures.length) {
  process.stderr.write(`\nPresupuesto incumplido:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}
process.stdout.write("\nPresupuesto correcto.\n");
