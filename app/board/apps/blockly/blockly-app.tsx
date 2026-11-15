"use client";

import type { StoreRole } from "../types";
import BlocklyCodePanel from "./blockly-code-panel";
import { useBlockly } from "./use-blockly";
import "./blockly.css";

/**
 * Programación por bloques con Blockly: caja de herramientas en español,
 * guardado por proyecto en la base de datos, generación de código y descarga.
 * @param props - Proyecto activo.
 * @returns El espacio de trabajo con su barra de acciones y panel de código.
 */
export default function BlocklyApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const {
    container, ready, status, showCode, codeTab, code, codeError, runResult, running,
    save, load, example, download, clear, toggleCode, selectTab, copyCode, run,
  } = useBlockly({ projectId, readOnly: role === "guest" });

  return (
    <div className="blockly-app">
      <div className="blockly-toolbar">
        <button type="button" onClick={() => void save()} disabled={!ready || role === "guest"}>Guardar</button>
        <button type="button" onClick={() => void load()} disabled={!ready}>Cargar</button>
        <button type="button" onClick={example} disabled={!ready || role === "guest"}>Ejemplo</button>
        <button type="button" onClick={download} disabled={!ready}>Descargar</button>
        <button type="button" onClick={clear} disabled={!ready || role === "guest"}>Limpiar</button>
        <button type="button" className="blockly-code-toggle" aria-pressed={showCode} onClick={toggleCode} disabled={!ready}>Código</button>
        <span className="blockly-status" role="status">{status || (ready ? "" : "Cargando Blockly…")}</span>
      </div>

      <div className="blockly-layout">
        <div className="blockly-stage" ref={container} aria-label="Espacio de trabajo de Blockly" />
        {showCode ? (
          <BlocklyCodePanel
            codeTab={codeTab}
            code={code}
            codeError={codeError}
            runResult={runResult}
            running={running}
            onTab={selectTab}
            onRun={() => void run()}
            onCopy={() => void copyCode()}
          />
        ) : null}
      </div>
    </div>
  );
}
