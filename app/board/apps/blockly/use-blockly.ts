"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDocument } from "../use-app-document";
import { runJavaScript } from "./blockly-run-worker";
import { BLOCKLY_STARTER } from "./blockly-starter";
import { BLOCKLY_TOOLBOX } from "./blockly-toolbox";
import type { CodeTab, RunResult } from "./blockly-types";

type Generator = { workspaceToCode: (workspace: import("blockly").WorkspaceSvg) => string };

/**
 * Estado y ciclo de vida del workspace de Blockly, guardado y ejecución.
 * @param props - Proyecto activo y si el lienzo es de solo lectura.
 * @returns Refs, estado y acciones para la interfaz.
 */
export function useBlockly({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
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
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const statusTimer = useRef<number | null>(null);

  const storageKey = `aula.blockly.${projectId}`;
  const { load: loadDocument, save: saveDocument } = useAppDocument<Record<string, unknown>>(projectId, "blockly");

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
    runJavaScript(source, (result) => {
      setRunning(false);
      setRunResult(result);
    });
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
        toolbox: readOnly ? undefined : BLOCKLY_TOOLBOX as unknown as import("blockly").utils.toolbox.ToolboxDefinition,
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
      const document = await loadDocument();
      if (document.state) {
        try {
          lib.serialization.workspaces.load(document.state, space);
          restored = true;
        } catch {
          /* documento no válido: se intenta el respaldo local */
        }
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
  }, [loadDocument, storageKey, readOnly]);

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
    const saved = await saveDocument(state);
    flash(saved ? "Programa guardado" : "Guardado solo en este navegador");
  };

  const load = async () => {
    if (!workspace.current || !blockly.current) return;
    try {
      const document = await loadDocument();
      if (document.state) {
        blockly.current.serialization.workspaces.load(document.state, workspace.current);
        flash("Programa cargado");
        return;
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
    blockly.current.serialization.workspaces.load(BLOCKLY_STARTER, workspace.current);
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

  return {
    container,
    ready,
    status,
    showCode,
    codeTab,
    code,
    codeError,
    runResult,
    running,
    save,
    load,
    example,
    download,
    clear,
    toggleCode,
    selectTab,
    copyCode,
    run,
  };
}
