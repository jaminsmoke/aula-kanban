/* eslint-disable no-console -- CLI de preparación: su salida es el SQL revisable. */
import { writeFileSync } from "node:fs";
import { buildDemoSql } from "../lib/domain/demo-sql.ts";

const args = process.argv.slice(2);
let out = "";
let help = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--out") {
    out = args[index + 1] ?? "";
    if (!out) throw new Error("Falta el valor de --out.");
    index += 1;
  } else if (arg.startsWith("--out=")) {
    out = arg.slice("--out=".length);
  } else if (arg === "--help" || arg === "-h") {
    help = true;
  } else {
    throw new Error(`Argumento desconocido: ${arg}`);
  }
}

if (help) {
  console.log(`Uso: node scripts/seed-demo-sql.mjs [--out demo-seed.sql]

Genera un SQL de datos idempotente para la demo. No escribe en la base:
revisa el archivo y aplícalo con D1. No toca instance_apps ni otros proyectos.
La ejecución remota corresponde a Codex.`);
} else {
  const sql = buildDemoSql();
  if (out) {
    writeFileSync(out, sql, "utf8");
    console.error(`SQL de la demo escrito en ${out}.`);
  } else {
    process.stdout.write(sql);
  }
}
