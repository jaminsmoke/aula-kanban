import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Línea base de imágenes: PER-02 mide la miniatura de tarea de 800 px y
// `--widths` permite comparar otros topes, como los de PER-04 en la pizarra.
const root = fileURLToPath(new URL("../", import.meta.url));
// Misma red que scripts/perf-latency.mjs: Fast 3G (1,6 Mbps de bajada).
const FAST_3G_BYTES_PER_SECOND = 200000;
const DEFAULT_TARGET_WIDTHS = [800];
const PNG_SCENARIOS = [
  { id: "logo-transparente", label: "Logo transparente (3000×2000)", width: 3000, height: 2000 },
  { id: "captura-texto", label: "Captura con texto (2560×1440)", width: 2560, height: 1440 },
];
const SCENARIOS = [
  { id: "foto-12mp", label: "Foto 12 MP (4032×3024)", width: 4032, height: 3024 },
  { id: "foto-2mp", label: "Foto 2 MP (1920×1080)", width: 1920, height: 1080 },
];
const defaults = {
  runs: 3,
  chrome: process.env.CHROME_PATH || defaultChromePath(),
};
const options = parseArgs(process.argv.slice(2));
const kind = options.kind ?? "photos";
const runs = Number(options.runs ?? defaults.runs);
const chromePath = String(options.chrome ?? defaults.chrome);
const defaultWidths = kind === "png" ? [2048] : DEFAULT_TARGET_WIDTHS;
const targetWidths = parseWidths(options.widths ?? defaultWidths.join(","));

if (kind !== "photos" && kind !== "png") throw new Error("--kind debe ser photos o png.");
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
      const samples = [];
      for (const width of targetWidths) {
        const measured = await cdp.eval(kind === "png"
          ? `${measurePngExpression(PNG_SCENARIOS, runs, width)}`
          : `${measureExpression(SCENARIOS, runs, width)}`);
        if (!Array.isArray(measured)) throw new Error("Chrome no devolvió las muestras esperadas.");
        samples.push(...measured.map((scenario) => ({ ...scenario, targetWidth: width })));
      }
      const result = {
        measuredAt: new Date().toISOString(),
        browser: "Chrome headless",
        kind,
        note: kind === "png"
          ? "PNG sintéticos generados en el navegador; se comparan PNG redimensionado, WebP 0,8 y WebP sin pérdida. La transferencia se calcula, no se mide en red."
          : "Imágenes sintéticas generadas en el navegador; decodificación con createImageBitmap. La transferencia se calcula, no se mide en red.",
        network: { label: "Fast 3G", bytesPerSecond: FAST_3G_BYTES_PER_SECOND },
        targetWidths,
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
 * @param {number} targetWidth - Ancho máximo del derivado.
 * @returns {string} Una promesa con las muestras.
 */
function measureExpression(scenarios, runs, targetWidth) {
  return `(async () => {
    const scenarios = ${JSON.stringify(scenarios)};
    const runs = ${runs};
    const targetWidth = ${targetWidth};
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
        const referencePixels = smallContext.getImageData(0, 0, width, height).data;
        const decodedCanvas = new OffscreenCanvas(width, height);
        const decodedContext = decodedCanvas.getContext("2d");
        decodedContext.drawImage(smallBitmap, 0, 0);
        const decodedPixels = decodedContext.getImageData(0, 0, width, height).data;
        let squaredError = 0;
        for (let index = 0; index < referencePixels.length; index += 4) {
          for (let channel = 0; channel < 3; channel += 1) {
            const delta = referencePixels[index + channel] - decodedPixels[index + channel];
            squaredError += delta * delta;
          }
        }
        const mse = squaredError / ((referencePixels.length / 4) * 3);
        const psnrDb = mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
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
          psnrDb,
        });
      }
      results.push({ id: scenario.id, label: scenario.label, samples });
    }
    return results;
  })()`;
}

/**
 * Construye la expresión que genera PNG sintéticos con transparencia y texto.
 * @param {typeof PNG_SCENARIOS} scenarios - Escenas a medir.
 * @param {number} runs - Muestras por escenario.
 * @param {number} targetWidth - Ancho máximo del derivado.
 * @returns {string} Una promesa con las muestras.
 */
function measurePngExpression(scenarios, runs, targetWidth) {
  return `(async () => {
    const scenarios = ${JSON.stringify(scenarios)};
    const runs = ${runs};
    const targetWidth = ${targetWidth};

    function drawLogo(context, width, height) {
      for (let index = 0; index < 18; index += 1) {
        context.beginPath();
        context.arc(
          width * (0.12 + ((index * 37) % 76) / 100),
          height * (0.15 + ((index * 53) % 70) / 100),
          width * (0.03 + ((index * 11) % 9) / 100),
          0,
          Math.PI * 2,
        );
        context.fillStyle = "rgba(" + (30 + index * 7) + ", " + (90 + index * 3) + ", " + (140 + index * 5) + ", " + (0.25 + ((index * 13) % 60) / 100) + ")";
        context.fill();
      }
      context.globalAlpha = 1;
      context.fillStyle = "#0b1f33";
      context.font = "bold " + Math.round(width / 9) + "px sans-serif";
      context.fillText("Aula", width * 0.08, height * 0.58);
      context.font = "600 " + Math.round(width / 26) + "px sans-serif";
      context.fillText("Kanban", width * 0.08, height * 0.74);
      context.strokeStyle = "rgba(20, 60, 90, 0.6)";
      context.lineWidth = Math.max(1, width / 700);
      context.strokeRect(width * 0.05, height * 0.08, width * 0.9, height * 0.84);
      context.setLineDash([width / 150, width / 300]);
      context.beginPath();
      context.moveTo(width * 0.08, height * 0.86);
      context.lineTo(width * 0.9, height * 0.86);
      context.stroke();
      context.setLineDash([]);
    }

    function drawScreenshot(context, width, height) {
      context.fillStyle = "#f7f8fa";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#1d3557";
      context.fillRect(0, 0, width, height * 0.07);
      context.fillStyle = "#ffffff";
      context.font = "bold " + Math.round(width / 90) + "px sans-serif";
      context.fillText("Aula Kanban · Tareas del proyecto", width * 0.03, height * 0.047);
      context.fillStyle = "#e8edf3";
      context.fillRect(0, height * 0.07, width * 0.2, height);
      const menu = ["Resumen", "Pendientes", "En curso", "Hechas", "Calendario", "Alumnado"];
      context.font = Math.round(width / 130) + "px sans-serif";
      for (let index = 0; index < menu.length; index += 1) {
        context.fillStyle = index === 0 ? "#1d3557" : "#425466";
        context.fillText(menu[index], width * 0.03, height * (0.14 + index * 0.05));
      }
      const cardWidth = width * 0.2;
      const cardHeight = height * 0.26;
      const titles = [
        "Preparar la práctica de sensores",
        "Revisar el informe del grupo 3",
        "Publicar el calendario de entrega",
        "Corregir las fichas pendientes",
        "Montar el tablero de la semana",
        "Actualizar el material de clase",
      ];
      context.font = Math.round(width / 150) + "px sans-serif";
      for (let index = 0; index < 6; index += 1) {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = width * 0.24 + column * (cardWidth + width * 0.02);
        const y = height * 0.12 + row * (cardHeight + height * 0.03);
        context.fillStyle = "#ffffff";
        context.fillRect(x, y, cardWidth, cardHeight);
        context.strokeStyle = "#d7dee6";
        context.lineWidth = 1;
        context.strokeRect(x, y, cardWidth, cardHeight);
        context.fillStyle = "#1d3557";
        context.fillText(titles[index], x + cardWidth * 0.06, y + cardHeight * 0.18);
        context.fillStyle = "#6b7a8c";
        for (let line = 0; line < 4; line += 1) {
          context.fillRect(x + cardWidth * 0.06, y + cardHeight * (0.3 + line * 0.09), cardWidth * (0.6 + (line % 3) * 0.08), Math.max(1, height / 800));
        }
        context.fillStyle = "#e8f0fb";
        context.fillRect(x + cardWidth * 0.06, y + cardHeight * 0.78, cardWidth * 0.34, cardHeight * 0.12);
        context.fillStyle = "#1d3557";
        context.font = Math.round(width / 190) + "px sans-serif";
        context.fillText("Media", x + cardWidth * 0.09, y + cardHeight * 0.855);
        context.font = Math.round(width / 150) + "px sans-serif";
      }
      context.strokeStyle = "#1d3557";
      context.lineWidth = Math.max(1, width / 900);
      context.beginPath();
      context.moveTo(width * 0.24, height * 0.94);
      context.lineTo(width * 0.96, height * 0.94);
      context.stroke();
    }

    const results = [];
    for (const scenario of scenarios) {
      const samples = [];
      for (let run = 0; run < runs; run += 1) {
        const width = scenario.width;
        const height = scenario.height;
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, width, height);
        if (scenario.id === "logo-transparente") drawLogo(context, width, height);
        else drawScreenshot(context, width, height);

        let started = performance.now();
        const original = await canvas.convertToBlob({ type: "image/png" });
        const encodeOriginalMs = performance.now() - started;

        started = performance.now();
        const bitmap = await createImageBitmap(original);
        const decodeOriginalMs = performance.now() - started;

        const scale = Math.min(1, targetWidth / width);
        const outWidth = Math.round(width * scale);
        const outHeight = Math.round(height * scale);
        const resized = new OffscreenCanvas(outWidth, outHeight);
        const resizedContext = resized.getContext("2d");
        started = performance.now();
        resizedContext.drawImage(bitmap, 0, 0, outWidth, outHeight);
        const resizeMs = performance.now() - started;

        started = performance.now();
        const resizedPng = await resized.convertToBlob({ type: "image/png" });
        const encodePngMs = performance.now() - started;

        started = performance.now();
        const lossy = await resized.convertToBlob({ type: "image/webp", quality: 0.8 });
        const encodeLossyMs = performance.now() - started;

        started = performance.now();
        const lossless = await resized.convertToBlob({ type: "image/webp", quality: 1 });
        const encodeLosslessMs = performance.now() - started;

        const reference = resizedContext.getImageData(0, 0, outWidth, outHeight).data;
        started = performance.now();
        const lossyBitmap = await createImageBitmap(lossy);
        const decodeLossyMs = performance.now() - started;
        const decoded = new OffscreenCanvas(outWidth, outHeight);
        const decodedContext = decoded.getContext("2d");
        decodedContext.drawImage(lossyBitmap, 0, 0);
        const decodedPixels = decodedContext.getImageData(0, 0, outWidth, outHeight).data;
        let squaredError = 0;
        let alphaMaxError = 0;
        for (let index = 0; index < reference.length; index += 4) {
          for (let channel = 0; channel < 3; channel += 1) {
            const delta = reference[index + channel] - decodedPixels[index + channel];
            squaredError += delta * delta;
          }
          const alphaDelta = Math.abs(reference[index + 3] - decodedPixels[index + 3]);
          if (alphaDelta > alphaMaxError) alphaMaxError = alphaDelta;
        }
        const mse = squaredError / ((reference.length / 4) * 3);
        const psnrDb = mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
        lossyBitmap.close();
        bitmap.close();

        samples.push({
          originalBytes: original.size,
          resizedPngBytes: resizedPng.size,
          lossyBytes: lossy.size,
          losslessBytes: lossless.size,
          decodedBytes: width * height * 4,
          width: outWidth,
          height: outHeight,
          encodeOriginalMs,
          decodeOriginalMs,
          resizeMs,
          encodePngMs,
          encodeLossyMs,
          encodeLosslessMs,
          decodeLossyMs,
          psnrDb,
          alphaMaxError,
        });
      }
      results.push({ id: scenario.id, label: scenario.label, samples });
    }
    return results;
  })()`;
}

/**
 * Resume las muestras y devuelve la tabla en Markdown.
 * @param {{kind?: string, runs: number, scenarios: Array<{label: string, samples: Array<Record<string, number>>}>}} result - Medición completa.
 * @returns {string} Tabla de resultados.
 */
function markdown(result) {
  return result.kind === "png" ? markdownPng(result) : markdownPhotos(result);
}

/**
 * Tabla de fotos opacas.
 * @param {{runs: number, scenarios: Array<{label: string, samples: Array<Record<string, number>>}>}} result - Medición completa.
 * @returns {string} Tabla de resultados.
 */
function markdownPhotos(result) {
  const lines = [
    "# Línea base de imágenes",
    "",
    `- Muestras por escenario: ${result.runs}`,
    `- Navegador: ${result.browser}`,
    `- Red de referencia para la transferencia: ${result.network.label}`,
    "",
    "| Escenario | Ancho derivado | Original | Derivado WebP | Reducción | Transferencia Fast 3G | Decodificación | Calidad (PSNR) | Memoria decodificada |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const scenario of result.scenarios) {
    const row = summarize(scenario.samples);
    lines.push(`| ${scenario.label} | ${row.width} px | ${bytes(row.originalBytes)} | ${bytes(row.derivativeBytes)} | ${percent(row.originalBytes, row.derivativeBytes)} | ${ms(transfer(row.originalBytes))} → ${ms(transfer(row.derivativeBytes))} | ${ms(row.decodeOriginalMs)} → ${ms(row.decodeDerivativeMs)} (codificar ${ms(row.encodeDerivativeMs)}) | ${db(row.psnrDb)} | ${bytes(row.decodedBytes)} → ${bytes(row.width * row.height * 4)} |`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Tabla de PNG con transparencia y capturas.
 * @param {{runs: number, scenarios: Array<{label: string, samples: Array<Record<string, number>>}>}} result - Medición completa.
 * @returns {string} Tabla de resultados.
 */
function markdownPng(result) {
  const lines = [
    "# Línea base de PNG y capturas",
    "",
    `- Muestras por escenario: ${result.runs}`,
    `- Navegador: ${result.browser}`,
    "",
    "| Escenario | Ancho | PNG original | PNG redimensionado | WebP 0,8 | WebP sin pérdida | PSNR 0,8 | Error alfa máx. | Transferencia Fast 3G (original → WebP 0,8) | Codificar 0,8 |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const scenario of result.scenarios) {
    const row = summarize(scenario.samples);
    lines.push(`| ${scenario.label} | ${row.width} px | ${bytes(row.originalBytes)} | ${bytes(row.resizedPngBytes)} | ${bytes(row.lossyBytes)} | ${bytes(row.losslessBytes)} | ${db(row.psnrDb)} | ${Math.round(row.alphaMaxError)} | ${ms(transfer(row.originalBytes))} → ${ms(transfer(row.lossyBytes))} | ${ms(row.encodeLossyMs)} |`);
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

/** Formatea la relación señal-ruido en decibelios. */
function db(value) {
  return `${value.toFixed(1).replace(".", ",")} dB`;
}

/**
 * Lee la lista de anchos objetivo separada por comas.
 * @param {string} value - Anchos pedidos.
 * @returns {number[]} Anchos válidos y sin repetir.
 */
function parseWidths(value) {
  const widths = [...new Set(String(value).split(",").map((item) => Number(item.trim())))];
  if (!widths.length || widths.some((width) => !Number.isInteger(width) || width < 64 || width > 4096)) {
    throw new Error("--widths debe ser una lista de enteros entre 64 y 4096.");
  }
  return widths;
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
