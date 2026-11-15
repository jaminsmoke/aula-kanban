import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const NETWORKS = {
  fast3g: { label: "Fast 3G", latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, downloadKbps: 1600 },
  slow3g: { label: "Slow 3G", latency: 400, downloadThroughput: 50000, uploadThroughput: 25000, downloadKbps: 400 },
};
const projectId = "11111111-1111-4111-8111-111111111111";
const defaults = {
  url: "http://127.0.0.1:8791",
  runs: 5,
  network: "fast3g",
  chrome: process.env.CHROME_PATH || defaultChromePath(),
};
const options = parseArgs(process.argv.slice(2));
const runs = Number(options.runs ?? defaults.runs);
const url = String(options.url ?? defaults.url).replace(/\/$/, "");
const network = String(options.network ?? defaults.network);
const chromePath = String(options.chrome ?? defaults.chrome);
const project = String(options.project ?? projectId);
const timeoutMs = Number(options.timeout ?? 45000);

if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs debe ser un entero positivo.");
if (!network || !(network in NETWORKS)) throw new Error(`Red desconocida: ${network}. Usa ${Object.keys(NETWORKS).join(", ")}.`);
if (!chromePath || !existsSync(chromePath)) throw new Error(`No se encontró Chrome. Indica --chrome o define CHROME_PATH.`);

async function main() {
const targetUrl = `${url}/?project=${encodeURIComponent(project)}&view=administracion&section=tienda`;
const profile = await mkdtemp(path.join(os.tmpdir(), "aula-perf-"));
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
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Network.setExtraHTTPHeaders", {
      headers: {
        "oai-authenticated-user-id": "local_seedy",
        "oai-authenticated-user-email": "seedy@sites.test",
        "oai-authenticated-user-full-name": "Seedy%20Local",
        "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
      },
    });

    const samples = [];
    for (let index = 1; index <= runs; index += 1) {
      const sample = await measure(cdp, "basica", targetUrl);
      samples.push(sample);
      process.stderr.write(`Básica ${index}/${runs}: open ${fmt(sample.openMs)}, eval ${fmt(sample.evalMs)}, total ${fmt(sample.totalMs)}\n`);
    }
    for (let index = 1; index <= runs; index += 1) {
      const sample = await measure(cdp, "cientifica", targetUrl);
      samples.push(sample);
      process.stderr.write(`Científica ${index}/${runs}: open ${fmt(sample.openMs)}, eval ${fmt(sample.evalMs)}, total ${fmt(sample.totalMs)}\n`);
    }

    const result = {
      measuredAt: new Date().toISOString(),
      url: targetUrl,
      network: NETWORKS[network],
      runs,
      browser: "Chrome headless",
      note: "Tiempo desde el inicio de la navegación; caché desactivada y limpiada en cada muestra.",
      samples,
      summary: summarize(samples),
    };
    const json = `${JSON.stringify(result, null, 2)}\n`;
    if (options.out) await writeFile(path.resolve(root, String(options.out)), json);
    if (options.json) process.stdout.write(json);
    else process.stdout.write(markdown(result));
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

/** Ejecuta una muestra completa: navegación, apertura y primer resultado. */
async function measure(cdp, mode, pageUrl) {
  const requests = [];
  const onRequest = (params) => requests.push(params.request?.url ?? "");
  cdp.on("Network.requestWillBeSent", onRequest);
  try {
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Storage.clearDataForOrigin", { origin: new URL(url).origin, storageTypes: "local_storage" });
    const networkProfile = NETWORKS[network];
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: networkProfile.latency,
      downloadThroughput: networkProfile.downloadThroughput,
      uploadThroughput: networkProfile.uploadThroughput,
      connectionType: "cellular3g",
    });
    const loaded = cdp.waitEvent("Page.loadEventFired", timeoutMs).catch(() => null);
    await cdp.send("Page.navigate", { url: pageUrl });
    await loaded;
    await cdp.waitFor(`[...document.querySelectorAll(".store-tool")].some((button) => button.textContent?.includes("Herramientas de aula"))`, timeoutMs);
    const opened = await cdp.eval(`(() => {
      const button = [...document.querySelectorAll(".store-tool")].find((item) => item.textContent?.includes("Herramientas de aula"));
      button?.click();
      return !!button;
    })()`);
    if (!opened) throw new Error("No se encontró el acceso a Herramientas de aula.");
    await cdp.waitFor(
      `!!document.querySelector(".calc") && [...document.querySelectorAll(".calc-modes button")].some((button) => button.textContent?.trim() === "Científica")`,
      timeoutMs,
    );
    const openMs = await cdp.eval("performance.now()");

    if (mode === "cientifica") {
      await cdp.eval(`[...document.querySelectorAll(".calc-modes button")].find((button) => button.textContent?.trim() === "Científica")?.click()`);
      await cdp.waitFor(`document.querySelector(".calc-extra")?.classList.contains("is-open")`, timeoutMs);
    }

    const pressed = await cdp.eval(`(async () => {
      const press = async (label) => {
        const button = document.querySelector('button[aria-label="' + label + '"]');
        if (!button) return false;
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
        return true;
      };
      return (await press("2")) && (await press("Sumar")) && (await press("2")) && (await press("Igual"));
    })()`);
    if (!pressed) throw new Error("No se pudieron pulsar las teclas de la calculadora.");
    try {
      await cdp.waitFor(`document.querySelector(".calc-value")?.textContent?.trim() === "4"`, timeoutMs);
    } catch (error) {
      const state = await cdp.eval(`({
        expression: document.querySelector(".calc-expression")?.textContent,
        value: document.querySelector(".calc-value")?.textContent,
        error: document.querySelector(".calc-value.is-error")?.textContent,
        body: document.body.innerText.slice(0, 1200)
      })`);
      throw new Error(`${error.message}\n${JSON.stringify(state)}`);
    }
    const totalMs = await cdp.eval("performance.now()");
    const engine = requests.some((requestUrl) => /compute-engine/.test(requestUrl));
    if (mode === "basica" && engine) throw new Error("La Básica ha descargado compute-engine durante la medición.");
    if (mode === "cientifica" && !engine) throw new Error("La Científica no ha descargado compute-engine durante la medición.");
    return { mode, openMs, evalMs: totalMs - openMs, totalMs, engine };
  } finally {
    cdp.off("Network.requestWillBeSent", onRequest);
  }
}

/** Resume las muestras por modo con la mediana y el rango. */
function summarize(samples) {
  return Object.fromEntries(["basica", "cientifica"].map((mode) => {
    const rows = samples.filter((sample) => sample.mode === mode);
    const medians = Object.fromEntries(["openMs", "evalMs", "totalMs"].map((key) => [key, median(rows.map((row) => row[key]))]));
    return [mode, {
      samples: rows.length,
      ...Object.fromEntries(Object.entries(medians).map(([key, value]) => [`median${key[0].toUpperCase()}${key.slice(1)}`, round(value)])),
      engineLoaded: rows.every((row) => row.engine),
    }];
  }));
}

function markdown(result) {
  const lines = [
    "# Latencia de la calculadora",
    "",
    `- Build: ${result.url}`,
    `- Red: ${result.network.label} (${result.network.downloadKbps} kbps, ${result.network.latency} ms RTT)`,
    `- Muestras por modo: ${result.runs}`,
    "",
    "| Modo | Apertura (mediana) | Primer resultado (mediana) | Total (mediana) |",
    "|---|---:|---:|---:|",
  ];
  for (const [mode, summary] of Object.entries(result.summary)) {
    lines.push(`| ${mode === "basica" ? "Básica" : "Científica"} | ${fmt(summary.medianOpenMs)} | ${fmt(summary.medianEvalMs)} | ${fmt(summary.medianTotalMs)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function fmt(ms) {
  return `${Math.round(ms)} ms`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

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

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

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

class Cdp {
  constructor(webSocketDebuggerUrl) {
    this.socket = new WebSocket(webSocketDebuggerUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", () => reject(new Error("No se pudo conectar con Chrome.")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const handler of this.handlers.get(message.method) ?? []) handler(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  off(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    this.handlers.set(method, handlers.filter((item) => item !== handler));
  }

  waitEvent(method, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.off(method, handler); reject(new Error(`Timeout esperando ${method}.`)); }, timeout);
      const handler = (params) => { clearTimeout(timer); this.off(method, handler); resolve(params); };
      this.on(method, handler);
    });
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "Error evaluando JavaScript en la página.");
    return result.result?.value;
  }

  async waitFor(expression, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.eval(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timeout esperando: ${expression}`);
  }

  close() {
    this.socket.close();
  }
}

await main();
