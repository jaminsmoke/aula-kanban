"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { GLModel, GLViewer } from "3dmol";
import { Atom, RotateCcw, Tags, ZoomIn, ZoomOut } from "lucide-react";
import { MOLECULES, getMolecule } from "./moleculas-data";
import { countSdfAtoms, isRenderableMolecule } from "./moleculas-model";
import "./moleculas.css";

const DEFAULT_MOLECULE_ID = "agua";

/**
 * Añade una etiqueta con el símbolo a cada átomo del modelo.
 * @param viewer - Visor de 3Dmol.
 * @param model - Modelo cargado.
 */
function addAtomLabels(viewer: GLViewer, model: GLModel) {
  for (const atom of model.selectedAtoms({})) {
    viewer.addLabel(atom.elem ?? "?", {
      position: { x: atom.x ?? 0, y: atom.y ?? 0, z: atom.z ?? 0 },
      fontSize: 13,
      fontColor: "#1c2a5a",
      backgroundColor: "#ffffff",
      backgroundOpacity: 0.85,
      borderThickness: 0.5,
      borderColor: "#d9d1fa",
      inFront: true,
    });
  }
}

/**
 * Calcula un acercamiento inicial según el tamaño de la molécula.
 * @param model - Modelo cargado en el visor.
 * @returns Factor de zoom aplicado tras encuadrar.
 */
function preferredZoomFactor(model: GLModel): number {
  const atoms = model.selectedAtoms({});
  if (!atoms.length) return 1;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const atom of atoms) {
    const x = atom.x ?? 0;
    const y = atom.y ?? 0;
    const z = atom.z ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  if (extent <= 1.5) return 3;
  if (extent <= 3.5) return 1.6;
  if (extent <= 5) return 1.2;
  return 1;
}

/**
 * Devuelve la duración de una animación respetando la reducción de movimiento.
 * @param duration - Duración normal en milisegundos.
 * @returns La duración efectiva.
 */
function motionDuration(duration: number): number {
  if (typeof window === "undefined") return 0;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? 0 : duration;
}

/**
 * Moléculas 3D: visor local con rotación, zoom y etiquetas.
 * @returns La ventana con el visor y la biblioteca de moléculas.
 */
export default function MoleculasApp() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const modelRef = useRef<GLModel | null>(null);
  const [selectedId, setSelectedId] = useState(DEFAULT_MOLECULE_ID);
  const [labels, setLabels] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [viewerVersion, setViewerVersion] = useState(0);
  const molecule = getMolecule(selectedId);
  const counts = countSdfAtoms(molecule.sdf);
  const loading = !initError && viewerVersion === 0;
  const viewerReady = viewerVersion > 0 && !initError;
  const status = initError
    ? initError
    : loading
      ? "Cargando visor molecular…"
      : !isRenderableMolecule(molecule)
        ? "La molécula seleccionada no tiene una estructura válida."
        : actionStatus || `${molecule.name}: ${counts.atoms} átomos y ${counts.bonds} enlaces.`;

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    let active = true;
    let viewer: GLViewer | null = null;

    void import("3dmol")
      .then(($3Dmol) => {
        if (!active) return;
        try {
          viewer = $3Dmol.createViewer(element, {
            backgroundColor: "#fbfaff",
            antialias: true,
          });
        } catch {
          setInitError("No se pudo iniciar WebGL. Prueba con otro navegador o activa la aceleración gráfica.");
          return;
        }
        viewerRef.current = viewer;
        setViewerVersion((value) => value + 1);
      })
      .catch(() => {
        if (active) {
          setInitError("No se pudo cargar el visor 3D. Recarga la página para intentarlo de nuevo.");
        }
      });

    return () => {
      active = false;
      viewer?.clear();
      element.replaceChildren();
      viewerRef.current = null;
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (initError) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      viewer.removeAllLabels();
      viewer.removeAllModels();

      if (!isRenderableMolecule(molecule)) return;

      const model = viewer.addModel(molecule.sdf, "sdf");
      modelRef.current = model;
      viewer.setStyle({}, {
        stick: { radius: 0.15, colorscheme: "Jmol" },
        sphere: { scale: 0.28, colorscheme: "Jmol" },
      });
      viewer.zoomTo();
      const factor = preferredZoomFactor(model);
      if (factor > 1) viewer.zoom(factor, 0);
      viewer.render();
    } catch {
      window.setTimeout(() => {
        setActionStatus("No se pudo cargar la molécula seleccionada.");
      }, 0);
    }
  }, [initError, molecule, viewerVersion]);

  useEffect(() => {
    if (initError) return;
    const viewer = viewerRef.current;
    const model = modelRef.current;
    if (!viewer || !model) return;

    viewer.removeAllLabels();
    if (labels) addAtomLabels(viewer, model);
    viewer.render();
  }, [initError, labels, selectedId, viewerVersion]);

  /**
   * Aplica un factor de zoom al visor.
   * @param factor - Factor de acercamiento o alejamiento.
   */
  function zoom(factor: number) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.zoom(factor, motionDuration(250));
    viewer.render();
    setActionStatus(factor > 1 ? "Vista ampliada." : "Vista reducida.");
  }

  /**
   * Recentra y ajusta la molécula al tamaño del visor.
   */
  function resetView() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.zoomTo();
    viewer.render();
    setActionStatus("Vista reajustada.");
  }

  /**
   * Gira o amplía el visor con el teclado.
   * @param event - Evento de teclado del lienzo.
   */
  function handleViewerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) return;

    const rotation = 15;
    const duration = motionDuration(120);

    switch (event.key) {
      case "ArrowLeft":
        viewer.rotate(rotation, "y", duration);
        break;
      case "ArrowRight":
        viewer.rotate(-rotation, "y", duration);
        break;
      case "ArrowUp":
        viewer.rotate(rotation, "x", duration);
        break;
      case "ArrowDown":
        viewer.rotate(-rotation, "x", duration);
        break;
      case "+":
      case "=":
        event.preventDefault();
        zoom(1.2);
        return;
      case "-":
      case "_":
        event.preventDefault();
        zoom(0.8);
        return;
      case "0":
        event.preventDefault();
        resetView();
        return;
      default:
        return;
    }

    event.preventDefault();
    viewer.render();
    setActionStatus("Vista girada.");
  }

  return (
    <div className="moleculas-app">
      <header className="moleculas-toolbar">
        <div className="moleculas-heading">
          <span className="moleculas-mark" aria-hidden>
            <Atom size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Moléculas 3D</strong>
            <small>Biblioteca molecular</small>
          </span>
        </div>
        <div className="moleculas-actions" role="group" aria-label="Controles del visor">
          <button type="button" onClick={() => zoom(1.2)} aria-label="Acercar" disabled={!viewerReady}>
            <ZoomIn size={15} aria-hidden />
            <span>Acercar</span>
          </button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Alejar" disabled={!viewerReady}>
            <ZoomOut size={15} aria-hidden />
            <span>Alejar</span>
          </button>
          <button type="button" onClick={resetView} aria-label="Recentrar vista" disabled={!viewerReady}>
            <RotateCcw size={15} aria-hidden />
            <span>Recentrar</span>
          </button>
          <button
            type="button"
            onClick={() => setLabels((value) => !value)}
            aria-pressed={labels}
            aria-label="Mostrar etiquetas de átomos"
            disabled={!viewerReady}
          >
            <Tags size={15} aria-hidden />
            <span>Etiquetas</span>
          </button>
        </div>
      </header>

      <div className="moleculas-layout">
        <section className="moleculas-stage" aria-label="Visor molecular">
          <div className="moleculas-canvas-wrap">
            <div
              ref={canvasRef}
              className="moleculas-canvas"
              role="img"
              aria-label={`Modelo 3D de ${molecule.name}. Usa las flechas para girar y más o menos para ampliar.`}
              aria-describedby="moleculas-hint"
              tabIndex={0}
              onKeyDown={handleViewerKeyDown}
            />
            {loading ? (
              <p className="moleculas-loading" aria-hidden="true">
                <span className="moleculas-spinner" />
                Cargando visor…
              </p>
            ) : null}
            {initError ? (
              <p className="moleculas-fallback" role="alert">{initError}</p>
            ) : null}
          </div>
          <p className="moleculas-hint" id="moleculas-hint">
            Arrastra para girar. Usa la rueda o los botones para ampliar. Con el visor enfocado, las flechas giran y + / − amplían.
          </p>
        </section>

        <aside className="moleculas-side">
          <section className="moleculas-controls" aria-label="Biblioteca de moléculas">
            <label htmlFor="moleculas-select">
              Molécula
              <select
                id="moleculas-select"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setActionStatus("");
                }}
              >
                {MOLECULES.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <p className="moleculas-status" role="status">{status}</p>
          </section>

          <section className="moleculas-info" aria-live="polite">
            <h3>{molecule.name}</h3>
            <p className="moleculas-formula">{molecule.formula}</p>
            <p className="moleculas-description">{molecule.description}</p>
            <dl className="moleculas-facts">
              <div>
                <dt>Átomos</dt>
                <dd>{counts.atoms}</dd>
              </div>
              <div>
                <dt>Enlaces</dt>
                <dd>{counts.bonds}</dd>
              </div>
            </dl>
            <p className="moleculas-source">Estructura 3D: PubChem · CID {molecule.cid}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
