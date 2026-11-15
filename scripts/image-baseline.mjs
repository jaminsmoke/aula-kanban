import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Línea base de PER-02: cuánto cuesta una imagen de tarea tal cual se sube
// frente a una miniatura de 800 px generada en el cliente.
const root = fileURLToPath(new URL("../", import.meta.url));
// Misma red que scripts/perf-latency.mjs: Fast 3G (1,6 Mbps de bajada).
const FAST_3G_BYTES_PER_SECOND = 200000;
const TARGET_WIDTH = 800;
const SCENARIOS = [
  { id: "foto-12mp", label: "Foto 12 MP (4032×3024)", width: 4032, height: 3024 },
  { id: "foto-2mp", label: "Foto 2 MP (1920×1080)", width: 1920, height: 1080 },
];
const defaults = {
  runs: 3,
  chrome: process.env.CHROME_PATH || defaultChromePath(),
};
const options = parseArgs(process.argv.slice(2));
const runs = Number(options.runs ?? defaults.runs);
const chromePath = String(options.chrome ?? defaults.chrome);

if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs debe ser un entero positivo.");
if (!chromePath || !existsSync(chromePath)) throw new Error("No se encontró Chrome. Indica --chrome o define CHROME_PATH.");

/** Genera las muestras en el navegador y las devuelve ya medidas. */
async function main() {
  const profile = await mkdtemp(path.join(os.tmpdir(), "aula-imagenes-"));
  const debugPort = await freePort();
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let chromeError = "";
  chrome.stderr.on("data", (chunk) => { chromeError += chunk.toString(); });

  try {
    const target = await openTarget(debugPort);
    const cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    try {
      await cdp.send("Runtime.enable");
      const samples = await cdp.eval(`${measureExpression(SCENARIOS, runs)}`);
      if (!Array.isArray(samples)) throw new Error("Chrome no devolvió las muestras esperadas.");
      const result = {
        measuredAt: new Date().toISOString(),
        browser: "Chrome headless",
        note: "Imágenes sintéticas generadas en el navegador; decodificación con createImageBitmap. La transferencia se calcula, no se mide en red.",
        network: { label: "Fast 3G", bytesPerSecond: FAST_3G_BYTES_PER_SECOND },
        targetWidth: TARGET_WIDTH,
        runs,
        scenarios: samples,
      };
      const json = `${JSON.stringify(result, null, 2)}\n`;
      if (options.out) await writeFile(path.resolve(root, String(options.out)), json);
      process.stdout.write(options.json ? json : markdown(result));
    } finally {
      cdp.close();
    }
  } catch (error) {
    if (chromeError) process.stderr.write(`Chrome: ${chromeError.slice(-2000)}\n`);
    throw error;
  } finally {
    chrome.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Construye la expresión que se evalúa en la página.
 * @param {typeof SCENARIOS} scenarios - Tamaños a medir.
 * @param {number} runs - Muestras por escenario.
 * @returns {string} Una promesa con las muestras.
 */
function measureExpression(scenarios, runs) {
  return `(async () => {
    const scenarios = ${JSON.stringify(scenarios)};
    const runs = ${runs};
    const targetWidth = ${TARGET_WIDTH};
    const results = [];
    for (const scenario of scenarios) {
      const samples = [];
      for (let run = 0; run < runs; run += 1) {
        let seed = 1000 + run;
        const rand = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const canvas = new OffscreenCanvas(scenario.width, scenario.height);
        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, scenario.width, scenario.height);
        gradient.addColorStop(0, "#1d3557");
        gradient.addColorStop(0.5, "#457b9d");
        gradient.addColorStop(1, "#f1faee");
        context.fillStyle = gradient;
        context.fillRect(0, 0, scenario.width, scenario.height);
        // Formas y texto para que la escena tenga bordes y detalle, no solo un degradado.
        for (let shape = 0; shape < 28; shape += 1) {
          const x = rand() * scenario.width;
          const y = rand() * scenario.height;
          const size = (0.05 + rand() * 0.25) * scenario.width;
          context.globalAlpha = 0.25 + rand() * 0.5;
          context.fillStyle = "hsl(" + Math.round(rand() * 360) + " 45% " + Math.round(25 + rand() * 50) + "%)";
          if (shape % 3 === 0) {
            context.beginPath();
            context.arc(x, y, size / 2, 0, Math.PI * 2);
            context.fill();
          } else {
            context.fillRect(x, y, size, size * (0.4 + rand() * 0.8));
          }
        }
        context.globalAlpha = 1;
        context.fillStyle = "#ffffff";
        context.font = "bold " + Math.round(scenario.width / 12) + "px sans-serif";
        context.fillText("Aula Kanban", scenario.width * 0.05, scenario.height * 0.55);
        // Grano a resolución completa, como el ruido de un sensor.
        const pixels = context.getImageData(0, 0, scenario.width, scenario.height);
        for (let index = 0; index < pixels.data.length; index += 4) {
          const grain = (rand() - 0.5) * 26;
          pixels.data[index] = Math.max(0, Math.min(255, pixels.data[index] + grain));
          pixels.data[index + 1] = Math.max(0, Math.min(255, pixels.data[index + 1] + grain));
          pixels.data[index + 2] = Math.max(0, Math.min(255, pixels.data[index + 2] + grain));
        }
        context.putImageData(pixels, 0, 0);

        let started = performance.now();
        const original = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
        const encodeOriginalMs = performance.now() - started;

        started = performance.now();
        const bitmap = await createImageBitmap(original);
        const decodeOriginalMs = performance.now() - started;
        const decodedBytes = bitmap.width * bitmap.height * 4;

        const scale = Math.min(1, targetWidth / scenario.width);
        const width = Math.round(scenario.width * scale);
        const height = Math.round(scenario.height * scale);
        const small = new OffscreenCanvas(width, height);
        const smallContext = small.getContext("2d");
        started = performance.now();
        smallContext.drawImage(bitmap, 0, 0, width, height);
        const resizeMs = performance.now() - started;

        started = performance.now();
        const derivative = await small.convertToBlob({ type: "image/webp", quality: 0.8 });
        const encodeDerivativeMs = performance.now() - started;

        started = performance.now();
        const smallBitmap = await createImageBitmap(derivative);
        const decodeDerivativeMs = performance.now() - started;
        smallBitmap.close();
        bitmap.close();

        samples.push({
          originalBytes: original.size,
          derivativeBytes: derivative.size,
          decodedBytes,
          width,
          height,
          encodeOriginalMs,
          decodeOriginalMs,
          resizeMs,
          encodeDerivativeMs,
          decodeDerivativeMs,
        });
      }
      results.push({ id: scenario.id, label: scenario.label, samples });
    }
    return results;
  })()`;
}

/**
 * Resume las muestras y devuelve la tabla en Markdown.
 * @param {{runs: number, scenarios: Array<{label: string, samples: Array<Record<string, number>>}>}} result - Medición completa.
 * @returns {string} Tabla de resultados.
 */
function markdown(result) {
  const lines = [
    "# Línea base de imágenes",
    "",
    `- Muestras por escenario: ${result.runs}`,
    `- Navegador: ${result.browser}`,
    `- Red de referencia para la transferencia: ${result.network.label}`,
    "",
    "| Escenario | Original | Derivado 800 px WebP | Reducción | Transferencia Fast 3G | Decodificación | Memoria decodificada |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];
  for (const scenario of result.scenarios) {
    const row = summarize(scenario.samples);
    lines.push(`| ${scenario.label} | ${bytes(row.originalBytes)} | ${bytes(row.derivativeBytes)} | ${percent(row.originalBytes, row.derivativeBytes)} | ${ms(transfer(row.originalBytes))} → ${ms(transfer(row.derivativeBytes))} | ${ms(row.decodeOriginalMs)} → ${ms(row.decodeDerivativeMs)} (codificar ${ms(row.encodeDerivativeMs)}) | ${bytes(row.decodedBytes)} → ${bytes(row.width * row.height * 4)} |`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Calcula la mediana de cada métrica de las muestras.
 * @param {Array<Record<string, number>>} samples - Muestras de un escenario.
 * @returns {Record<string, number>} Medianas.
 */
function summarize(samples) {
  const keys = Object.keys(samples[0]);
  return Object.fromEntries(keys.map((key) => [key, median(samples.map((sample) => sample[key]))]));
}

/**
 * Tiempo de transferencia estimado para un tamaño.
 * @param {number} bytes - Tamaño en bytes.
 * @returns {number} Milisegundos estimados.
 */
function transfer(bytes) {
  return (bytes / FAST_3G_BYTES_PER_SECOND) * 1000;
}

/** Mediana de una lista de números. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Formatea bytes en KB o MB con coma decimal. */
function bytes(value) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${(value / 1024).toFixed(0)} KB`;
}

/** Formatea milisegundos. */
function ms(value) {
  return `${Math.round(value)} ms`;
}

/** Porcentaje de reducción entre dos tamaños. */
function percent(original, derivative) {
  return `${Math.round((1 - derivative / original) * 100)} %`;
}

/** Lee argumentos `--clave valor`. */
function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[index + 1] && !args[index + 1].startsWith("--") ? args[++index] : true;
    result[key] = value;
  }
  return result;
}

/** Ruta de Chrome por defecto en Windows o en PATH. */
function defaultChromePath() {
  if (process.platform === "win32") {
    for (const candidate of [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ]) if (existsSync(candidate)) return candidate;
  }
  return ["google-chrome", "chromium", "chromium-browser"].find((candidate) => {
    try { return existsSync(candidate); } catch { return false; }
  }) ?? "";
}

/** Puerto libre en loopback. */
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/**
 * Espera al objetivo de depuración de Chrome.
 * @param {number} port - Puerto de depuración.
 * @returns {Promise<{webSocketDebuggerUrl: string}>} Objetivo de página.
 */
async function openTarget(port) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch { /* Chrome aún arrancando */ }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Chrome no abrió el puerto de depuración.");
}

/** Cliente mínimo del protocolo de Chrome. */
class Cdp {
  constructor(webSocketDebuggerUrl) {
    this.socket = new WebSocket(webSocketDebuggerUrl);
    this.nextId = 1;
    this.pending = new Map();
  }

  /** Abre el socket. */
  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", () => reject(new Error("No se pudo conectar con Chrome.")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  /** Envía un comando y espera su resultado. */
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Evalúa una expresión en la página. */
  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "Error evaluando JavaScript en la página.");
    return result.result?.value;
  }

  /** Cierra el socket. */
  close() {
    this.socket.close();
  }
}

await main();
