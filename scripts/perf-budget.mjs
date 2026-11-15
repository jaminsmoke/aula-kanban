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

const rows = report.flows.map((flow) => {
  const limit = budget.flows?.[flow.id];
  return `${flow.id.padEnd(18)} ${String(flow.gzip).padStart(9)} B gzip / ${String(limit).padStart(9)} B`;
});
process.stdout.write(`${rows.join("\n")}\n`);
if (failures.length) {
  process.stderr.write(`\nPresupuesto incumplido:\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}
process.stdout.write("\nPresupuesto correcto.\n");
