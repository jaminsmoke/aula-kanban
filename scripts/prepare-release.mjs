import { readFile, writeFile } from "node:fs/promises";

const index = process.argv.indexOf("--published-version");
const published = index >= 0 ? process.argv[index + 1] : "";
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
if (!semver.test(published)) throw new Error("Indica la versión publicada verificada: --published-version X.Y.Z");
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const local = manifest.version;
if (!semver.test(local) || lock.version !== local || lock.packages?.[""]?.version !== local)
  throw new Error("Las versiones de package.json y package-lock.json deben coincidir.");
const [a, b, c] = local.split(".").map(Number);
const [x, y, z] = published.split(".").map(Number);
if (a < x || (a === x && b < y) || (a === x && b === y && c < z))
  throw new Error("La versión local es anterior a la publicada; sincroniza antes de continuar.");
const next = a === x && b === y && c === z ? `${a}.${b}.${c + 1}` : local;
if (next !== local) {
  manifest.version = next;
  lock.version = next;
  lock.packages[""].version = next;
  await writeFile("package.json", JSON.stringify(manifest, null, 2) + "\n");
  await writeFile("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
}
process.stdout.write(`Versión preparada: ${next}${next === local ? " (ya estaba preparada)" : ""}\n`);
