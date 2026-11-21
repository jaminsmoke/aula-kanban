import type { RunResult } from "./blockly-types";

/**
 * Ejecuta JavaScript generado en un worker aislado con límite de tiempo.
 * @param source - Código JavaScript a ejecutar.
 * @param onResult - Recibe el resultado o el error.
 * @returns Función para cancelar la ejecución.
 */
export function runJavaScript(source: string, onResult: (result: RunResult) => void): () => void {
  const executor = `
    self.onmessage = function (event) {
      var logs = [];
      var send = function () { logs.push(Array.prototype.map.call(arguments, String).join(" ")); };
      try {
        var run = new Function("print", "alert", "window", "console", "\\"use strict\\";\\n" + event.data);
        run(send, send, { alert: send }, { log: send, warn: send, error: send });
        self.postMessage({ ok: true, logs: logs });
      } catch (error) {
        self.postMessage({ ok: false, logs: logs, error: String(error) });
      }
    };
  `;

  let url: string | null = null;
  try {
    const blob = new Blob([executor], { type: "text/javascript" });
    url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    let settled = false;
    const stop = () => {
      window.clearTimeout(timer);
      worker.terminate();
      if (url) {
        URL.revokeObjectURL(url);
        url = null;
      }
    };
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      stop();
      onResult(result);
    };
    const timer = window.setTimeout(() => {
      finish({ kind: "timeout", logs: [], message: "El programa tardó demasiado. ¿Tienes un bucle infinito?" });
    }, 2500);
    worker.onmessage = (event) => {
      const data = event.data as { ok: boolean; logs: string[]; error?: string };
      finish(data.ok ? { kind: "ok", logs: data.logs } : { kind: "error", logs: data.logs, message: data.error });
    };
    worker.onerror = (event) => {
      finish({ kind: "error", logs: [], message: event.message || "No se pudo ejecutar el programa." });
    };
    worker.postMessage(source);
    return () => finish({ kind: "error", logs: [], message: "Ejecución cancelada." });
  } catch {
    if (url) URL.revokeObjectURL(url);
    onResult({ kind: "error", logs: [], message: "No se pudo iniciar el entorno de ejecución. Comprueba que tu navegador permite workers." });
    return () => {};
  }
}
