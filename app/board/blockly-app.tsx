"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpaceRole } from "./tools";
import "./blockly.css";

/** Bloques disponibles en la caja de herramientas. */
const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Lógica",
      colour: "#5b80a5",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
      ],
    },
    {
      kind: "category",
      name: "Bucles",
      colour: "#5ba55b",
      contents: [
        { kind: "block", type: "controls_repeat_ext" },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Matemáticas",
      colour: "#5b67a5",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_random_int" },
        { kind: "block", type: "math_number_property" },
      ],
    },
    {
      kind: "category",
      name: "Texto",
      colour: "#5ba58c",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_print" },
        { kind: "block", type: "text_length" },
      ],
    },
    {
      kind: "category",
      name: "Variables",
      colour: "#a55b80",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Funciones",
      colour: "#995ba5",
      custom: "PROCEDURE",
    },
  ],
};

/** Programa de ejemplo que se ofrece cuando el lienzo está vacío. */
const STARTER = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "text_print",
        x: 48,
        y: 40,
        inputs: {
          TEXT: { shadow: { type: "text", fields: { TEXT: "¡Hola, aula!" } } },
        },
      },
      {
        type: "controls_repeat_ext",
        x: 48,
        y: 130,
        inputs: {
          TIMES: { shadow: { type: "math_number", fields: { NUM: 3 } } },
          DO: {
            block: {
              type: "text_print",
              inputs: {
                TEXT: { shadow: { type: "text", fields: { TEXT: "Repitiendo…" } } },
              },
            },
          },
        },
      },
    ],
  },
};

type Generator = { workspaceToCode: (workspace: import("blockly").WorkspaceSvg) => string };
type CodeTab = "javascript" | "python";

/**
 * Programación por bloques con Blockly: caja de herramientas en español,
 * guardado por proyecto en la base de datos, generación de código y descarga.
 * @param props - Proyecto activo.
 * @returns El espacio de trabajo con su barra de acciones y panel de código.
 */
export default function BlocklyApp({ projectId, role }: { projectId: string; role: SpaceRole }) {
  const readOnly = role === "guest";
  const container = useRef<HTMLDivElement>(null);
  const workspace = useRef<import("blockly").WorkspaceSvg | null>(null);
  const blockly = useRef<typeof import("blockly") | null>(null);
  const generators = useRef<{ javascript?: Generator; python?: Generator }>({});
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [codeTab, setCodeTab] = useState<CodeTab>("javascript");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ kind: "ok" | "error" | "timeout"; logs: string[]; message?: string } | null>(null);
  const [running, setRunning] = useState(false);
  const statusTimer = useRef<number | null>(null);

  const storageKey = `aula.blockly.${projectId}`;
  const endpoint = `/api/blockly-programs?project=${encodeURIComponent(projectId)}`;

  const flash = useCallback((message: string) => {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 2400);
  }, []);

  /**
   * Genera el código actual del lienzo.
   * @param tab - Lenguaje de generación.
   * @returns El código generado (vacío si falla).
   */
  const generate = useCallback(async (tab: CodeTab): Promise<string> => {
    setCodeError(null);
    setRunResult(null);
    const space = workspace.current;
    if (!space) return "";
    try {
      if (!generators.current.javascript || !generators.current.python) {
        const [js, py] = await Promise.all([import("blockly/javascript"), import("blockly/python")]);
        generators.current.javascript = js.javascriptGenerator;
        generators.current.python = py.pythonGenerator;
      }
      const generator = tab === "javascript" ? generators.current.javascript : generators.current.python;
      const next = generator?.workspaceToCode(space) ?? "";
      setCode(next);
      return next;
    } catch {
      setCode("");
      setCodeError("No se pudo generar el código. Revisa los bloques del lienzo.");
      return "";
    }
  }, []);

  /** Ejecuta el JavaScript generado en un worker y recoge su salida. */
  const run = useCallback(async () => {
    if (codeTab !== "javascript") {
      setRunResult({ kind: "error", logs: [], message: "La ejecución está disponible en JavaScript. Copia el código Python para usarlo en tu entorno." });
      return;
    }
    setRunning(true);
    // Se regenera siempre antes de ejecutar: el lienzo puede haber cambiado
    // desde la última generación mostrada.
    const source = await generate("javascript");
    if (!source.trim()) {
      setRunning(false);
      setRunResult({ kind: "error", logs: [], message: "No hay código que ejecutar. Añade bloques al lienzo." });
      return;
    }
    setRunResult(null);

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

    try {
      const blob = new Blob([executor], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      const timer = window.setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(url);
        setRunning(false);
        setRunResult({ kind: "timeout", logs: [], message: "El programa tardó demasiado. ¿Tienes un bucle infinito?" });
      }, 2500);
      worker.onmessage = (event) => {
        window.clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        setRunning(false);
        const data = event.data as { ok: boolean; logs: string[]; error?: string };
        setRunResult(data.ok ? { kind: "ok", logs: data.logs } : { kind: "error", logs: data.logs, message: data.error });
      };
      worker.onerror = (event) => {
        window.clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
        setRunning(false);
        setRunResult({ kind: "error", logs: [], message: event.message || "No se pudo ejecutar el programa." });
      };
      worker.postMessage(source);
    } catch {
      setRunResult({ kind: "error", logs: [], message: "No se pudo iniciar el entorno de ejecución. Comprueba que tu navegador permite workers." });
      setRunning(false);
    }
  }, [codeTab, generate]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | null = null;

    void (async () => {
      const lib = await import("blockly");
      const locale = await import("blockly/msg/es");
      lib.setLocale(locale as unknown as Record<string, string>);
      if (disposed || !container.current) return;

      const space = lib.inject(container.current, {
        toolbox: readOnly ? undefined : TOOLBOX as unknown as import("blockly").utils.toolbox.ToolboxDefinition,
        readOnly,
        renderer: "zelos",
        media: "/blockly-media/",
        trashcan: true,
        scrollbars: true,
        move: { scrollbars: true, drag: true, wheel: true },
        zoom: { controls: true, wheel: true, startScale: 0.85, maxScale: 2, minScale: 0.4 },
        grid: { spacing: 24, length: 3, colour: "#e7e4ef", snap: true },
      });

      blockly.current = lib;
      workspace.current = space;

      let restored = false;
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { state?: unknown };
          if (data.state) {
            lib.serialization.workspaces.load(data.state as Record<string, unknown>, space);
            restored = true;
          }
        }
      } catch {
        /* sin conexión con la base de datos */
      }
      if (!restored) {
        try {
          const saved = window.localStorage.getItem(storageKey);
          if (saved) lib.serialization.workspaces.load(JSON.parse(saved), space);
        } catch {
          /* estado local no válido */
        }
      }

      observer = new ResizeObserver(() => lib.svgResize(space));
      observer.observe(container.current);
      setReady(true);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
      workspace.current?.dispose();
      workspace.current = null;
    };
  }, [endpoint, storageKey, readOnly]);

  // Mientras el panel de código está abierto, se regenera al cambiar el lienzo.
  useEffect(() => {
    if (!ready || !showCode) return;
    const space = workspace.current;
    if (!space) return;
    let timer: number | null = null;
    const listener = (event: { isUiEvent?: boolean }) => {
      if (event.isUiEvent) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { void generate(codeTab); }, 300);
    };
    space.addChangeListener(listener);
    return () => {
      if (timer) window.clearTimeout(timer);
      space.removeChangeListener(listener);
    };
  }, [ready, showCode, codeTab, generate]);

  const serialize = (): Record<string, unknown> | null => {
    if (!workspace.current || !blockly.current) return null;
    return blockly.current.serialization.workspaces.save(workspace.current) as Record<string, unknown>;
  };

  const save = async () => {
    const state = serialize();
    if (!state) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* sin respaldo local */
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state }),
      });
      if (!response.ok) throw new Error();
      flash("Programa guardado");
    } catch {
      flash("Guardado solo en este navegador");
    }
  };

  const load = async () => {
    if (!workspace.current || !blockly.current) return;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as { state?: unknown };
        if (data.state) {
          blockly.current.serialization.workspaces.load(data.state as Record<string, unknown>, workspace.current);
          flash("Programa cargado");
          return;
        }
      }
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) { flash("No hay ningún programa guardado"); return; }
      blockly.current.serialization.workspaces.load(JSON.parse(saved), workspace.current);
      flash("Programa cargado del navegador");
    } catch {
      flash("No se pudo cargar el programa");
    }
  };

  const clear = () => {
    workspace.current?.clear();
    flash("Lienzo limpiado");
  };

  const example = () => {
    if (!workspace.current || !blockly.current) return;
    blockly.current.serialization.workspaces.load(STARTER, workspace.current);
    flash("Ejemplo cargado");
  };

  const download = () => {
    const state = serialize();
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `programa-${projectId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    flash("Programa descargado");
  };

  const toggleCode = () => {
    const next = !showCode;
    setShowCode(next);
    if (next) void generate(codeTab);
  };

  const selectTab = (tab: CodeTab) => {
    setCodeTab(tab);
    void generate(tab);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      flash("Código copiado");
    } catch {
      flash("No se pudo copiar");
    }
  };

  return (
    <div className="blockly-app">
      <div className="blockly-toolbar">
        <button type="button" onClick={() => void save()} disabled={!ready || readOnly}>Guardar</button>
        <button type="button" onClick={() => void load()} disabled={!ready}>Cargar</button>
        <button type="button" onClick={example} disabled={!ready || readOnly}>Ejemplo</button>
        <button type="button" onClick={download} disabled={!ready}>Descargar</button>
        <button type="button" onClick={clear} disabled={!ready || readOnly}>Limpiar</button>
        <button type="button" className="blockly-code-toggle" aria-pressed={showCode} onClick={toggleCode} disabled={!ready}>Código</button>
        <span className="blockly-status" role="status">{status || (ready ? "" : "Cargando Blockly…")}</span>
      </div>

      <div className="blockly-layout">
        <div className="blockly-stage" ref={container} aria-label="Espacio de trabajo de Blockly" />

        {showCode ? (
          <aside className="blockly-code" aria-label="Código generado">
            <div className="blockly-code-head">
              <div className="blockly-code-tabs" role="tablist" aria-label="Lenguaje del código">
                <button type="button" role="tab" aria-selected={codeTab === "javascript"} onClick={() => selectTab("javascript")}>JavaScript</button>
                <button type="button" role="tab" aria-selected={codeTab === "python"} onClick={() => selectTab("python")}>Python</button>
              </div>
              <div className="blockly-code-actions">
                <button type="button" className="blockly-code-run" onClick={() => void run()} disabled={running}>{running ? "Ejecutando…" : "Probar"}</button>
                <button type="button" className="blockly-code-copy" onClick={() => void copyCode()}>Copiar</button>
              </div>
            </div>
            {codeError ? (
              <p className="blockly-code-error" role="alert">{codeError}</p>
            ) : (
              <pre className="blockly-code-body">{code || "Añade bloques para ver el código."}</pre>
            )}
            {runResult ? (
              <div className={`blockly-run is-${runResult.kind}`} role="status">
                <span className="blockly-run-title">
                  {runResult.kind === "ok" ? "Salida" : runResult.kind === "timeout" ? "Tiempo agotado" : "Error"}
                </span>
                {runResult.message ? <p className="blockly-run-message">{runResult.message}</p> : null}
                {runResult.logs.length > 0 ? (
                  <ol className="blockly-run-logs">
                    {runResult.logs.map((line, index) => <li key={index}>{line}</li>)}
                  </ol>
                ) : runResult.kind === "ok" ? (
                  <p className="blockly-run-message">El programa no imprimió nada.</p>
                ) : null}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
