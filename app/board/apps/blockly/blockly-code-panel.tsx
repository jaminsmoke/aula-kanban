"use client";

import type { CodeTab, RunResult } from "./blockly-types";

/**
 * Panel lateral con el código generado y la salida del programa.
 * @param props - Pestaña, código, errores, resultado y acciones.
 * @returns El panel de código.
 */
export default function BlocklyCodePanel({ codeTab, code, codeError, runResult, running, onTab, onRun, onCopy }: {
  codeTab: CodeTab;
  code: string;
  codeError: string | null;
  runResult: RunResult | null;
  running: boolean;
  onTab: (tab: CodeTab) => void;
  onRun: () => void;
  onCopy: () => void;
}) {
  return (
    <aside className="blockly-code" aria-label="Código generado">
      <div className="blockly-code-head">
        <div className="blockly-code-tabs" role="tablist" aria-label="Lenguaje del código">
          <button type="button" role="tab" aria-selected={codeTab === "javascript"} onClick={() => onTab("javascript")}>JavaScript</button>
          <button type="button" role="tab" aria-selected={codeTab === "python"} onClick={() => onTab("python")}>Python</button>
        </div>
        <div className="blockly-code-actions">
          <button type="button" className="blockly-code-run" onClick={onRun} disabled={running}>{running ? "Ejecutando…" : "Probar"}</button>
          <button type="button" className="blockly-code-copy" onClick={onCopy}>Copiar</button>
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
  );
}
