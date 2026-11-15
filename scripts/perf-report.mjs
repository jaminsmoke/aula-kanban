import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const clientDir = path.join(root, "dist", "client");
const manifestPath = path.join(clientDir, ".vite", "manifest.json");

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    throw new Error("Falta dist/client. Ejecuta `npm run build` antes de generar el informe.");
  }
  throw error;
}

const stats = new Map();

/** Lee un archivo del cliente y calcula su tamaño bruto y gzip. */
async function measure(file) {
  if (!stats.has(file)) {
    const contents = await readFile(path.join(clientDir, file));
    stats.set(file, {
      raw: contents.byteLength,
      gzip: gzipSync(contents, { level: 9 }).byteLength,
    });
  }
  return stats.get(file);
}

/** Busca una clave única del manifiesto sin depender del hash del chunk. */
function findKey(pattern, label) {
  const keys = Object.keys(manifest).filter((key) => pattern.test(key));
  if (keys.length !== 1) {
    throw new Error(`No se encontró una única entrada para ${label}: ${keys.length} coincidencias.`);
  }
  return keys[0];
}

const browserEntry = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!browserEntry) throw new Error("El manifiesto no declara una entrada de navegador.");

const mermaidFlow = findKey(
  /^node_modules\/mermaid\/dist\/chunks\/mermaid\.core\/flowDiagram-[^/]+\.mjs$/,
  "el diagrama de flujo de Mermaid",
);
const mermaidElk = findKey(
  /^node_modules\/mermaid\/dist\/chunks\/mermaid\.core\/elk-[^/]+\.mjs$/,
  "ELK de Mermaid",
);
const excalidrawWasm = Object.keys(manifest).find((key) =>
  /\/chunk-EIO[^/]+\.js$/.test(manifest[key].file ?? ""),
);
if (!excalidrawWasm) throw new Error("No se encontró el chunk wasm de Excalidraw en el manifiesto.");

const FLOWS = [
  {
    id: "tablero",
    label: "Tablero",
    roots: [browserEntry, "app/board.tsx"],
  },
  {
    id: "basica",
    label: "Herramientas de aula · abrir Básica",
    roots: ["app/board/apps/edu-tools/edu-tools-app.tsx"],
  },
  {
    id: "basica-evalua",
    label: "Herramientas de aula · primer = en Básica",
    roots: ["app/board/apps/edu-tools/edu-tools-app.tsx"],
  },
  {
    id: "cientifica",
    label: "Herramientas de aula · Científica/Ecuaciones",
    roots: [
      "app/board/apps/edu-tools/edu-tools-app.tsx",
      "node_modules/@cortex-js/compute-engine/dist/esm-min/compute-engine.js",
      "app/board/apps/edu-tools/calculator/multi-equation.tsx",
    ],
  },
  {
    id: "diagramas",
    label: "Diagramas · flujo inicial",
    roots: [
      "app/board/apps/mermaid/mermaid-app.tsx",
      "node_modules/mermaid/dist/mermaid.core.mjs",
      mermaidFlow,
    ],
  },
  {
    id: "diagramas-elk",
    label: "Diagramas · con ELK",
    roots: [
      "app/board/apps/mermaid/mermaid-app.tsx",
      "node_modules/mermaid/dist/mermaid.core.mjs",
      mermaidElk,
    ],
  },
  {
    id: "pizarra",
    label: "Pizarra · abrir",
    roots: [
      "app/board/shared/whiteboard/index.ts",
      excalidrawWasm,
    ],
  },
  {
    id: "pizarra-mermaid",
    label: "Pizarra · conversión Mermaid",
    roots: [
      "app/board/shared/whiteboard/index.ts",
      excalidrawWasm,
      "node_modules/@excalidraw/mermaid-to-excalidraw/dist/index.js",
    ],
  },
  {
    id: "blockly",
    label: "Blockly · abrir",
    roots: [
      "app/board/apps/blockly/blockly-app.tsx",
      "node_modules/blockly/index.mjs",
    ],
  },
  {
    id: "blockly-codigo",
    label: "Blockly · panel de código",
    roots: [
      "app/board/apps/blockly/blockly-app.tsx",
      "node_modules/blockly/index.mjs",
      "node_modules/blockly/javascript.mjs",
      "node_modules/blockly/python.mjs",
      "node_modules/blockly/msg/es.mjs",
    ],
  },
];

/** Recorre solo imports estáticos; los dynamicImports se añaden como raíces explícitas. */
function collect(key, seen, missing) {
  const entry = manifest[key];
  if (!entry) {
    if (!key.startsWith("virtual:") && /\.(?:js|css)$/.test(key)) {
      seen.add(key);
      return;
    }
    missing.add(key);
    return;
  }

  if (entry.file) seen.add(entry.file);
  for (const css of entry.css ?? []) seen.add(css);
  for (const imported of entry.imports ?? []) collect(imported, seen, missing);
}

const report = {
  manifest: "dist/client/.vite/manifest.json",
  unit: "bytes",
  flows: [],
};

for (const flow of FLOWS) {
  const seen = new Set();
  const missing = new Set();
  for (const rootKey of flow.roots) {
    if (!manifest[rootKey]) throw new Error(`La raíz ${rootKey} no existe en el manifiesto.`);
    collect(rootKey, seen, missing);
  }

  const files = [];
  for (const file of seen) {
    files.push({ file, ...(await measure(file)) });
  }
  files.sort((a, b) => b.gzip - a.gzip || a.file.localeCompare(b.file));

  report.flows.push({
    id: flow.id,
    label: flow.label,
    roots: flow.roots,
    raw: files.reduce((total, file) => total + file.raw, 0),
    gzip: files.reduce((total, file) => total + file.gzip, 0),
    fileCount: files.length,
    files: files.slice(0, 12),
    ...(missing.size ? { missing: [...missing].sort() } : {}),
  });
}

const basic = report.flows.find((flow) => flow.id === "basica-evalua");
if (basic?.files.some((file) => file.file.includes("compute-engine"))) {
  throw new Error("La calculadora básica ha vuelto a incluir compute-engine en su flujo.");
}

const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

function markdown() {
  const lines = [
    "# Informe de chunks por flujo",
    "",
    "| Flujo | Bruto | Gzip | Archivos |",
    "|---|---:|---:|---:|",
  ];
  for (const flow of report.flows) {
    lines.push(`| ${flow.label} | ${format(flow.raw)} | ${format(flow.gzip)} | ${flow.fileCount} |`);
  }
  for (const flow of report.flows) {
    lines.push("", `## ${flow.label}`, "", "| Archivo | Bruto | Gzip |", "|---|---:|---:|");
    for (const file of flow.files) {
      lines.push(`| \`${file.file}\` | ${format(file.raw)} | ${format(file.gzip)} |`);
    }
    if (flow.missing?.length) lines.push("", `Faltan en el manifiesto: ${flow.missing.join(", ")}`);
  }
  return `${lines.join("\n")}\n`;
}

const outIndex = process.argv.indexOf("--out");
const out = outIndex >= 0 ? process.argv[outIndex + 1] : null;
if (outIndex >= 0 && !out) throw new Error("Indica una ruta después de --out.");

if (out) {
  await writeFile(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(markdown());
}
