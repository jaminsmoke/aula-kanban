"use client";

import { useEffect, useRef, useState } from "react";
import { Composite, Engine, Mouse, MouseConstraint, Render, Runner } from "matter-js";
import { Atom, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { createBall, createScene, PRESETS, SCENE_HEIGHT, SCENE_WIDTH, type PresetId } from "./fisica-model";
import "./fisica.css";

/**
 * Laboratorio de física 2D con escenas efímeras y arrastre de cuerpos.
 * @returns La ventana con el lienzo y los controles.
 */
export default function FisicaApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const runnerRef = useRef<Runner | null>(null);
  const mouseRef = useRef<Mouse | null>(null);
  const ballIndex = useRef(0);
  const [preset, setPreset] = useState<PresetId>("gravedad");
  const [gravity, setGravity] = useState(1);
  const [running, setRunning] = useState(true);
  const [sceneVersion, setSceneVersion] = useState(0);
  const currentPreset = PRESETS.find((item) => item.id === preset) ?? PRESETS[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createScene(preset);
    engineRef.current = scene.engine;

    const render = Render.create({
      canvas,
      engine: scene.engine,
      options: {
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
        wireframes: false,
        background: "transparent",
        pixelRatio: 1,
      },
    });
    const runner = Runner.create();
    runnerRef.current = runner;
    Render.run(render);

    const mouse = Mouse.create(canvas);
    mouseRef.current = mouse;
    const updateScale = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      Mouse.setScale(mouse, { x: SCENE_WIDTH / rect.width, y: SCENE_HEIGHT / rect.height });
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(canvas);

    Composite.add(scene.engine.world, MouseConstraint.create(scene.engine, {
      mouse,
      constraint: { stiffness: 0.15, render: { visible: false } },
    }));

    return () => {
      observer.disconnect();
      Render.stop(render);
      Runner.stop(runner);
      Mouse.clearSourceEvents(mouse);
      Composite.clear(scene.engine.world, false);
      Engine.clear(scene.engine);
      engineRef.current = null;
      runnerRef.current = null;
      mouseRef.current = null;
    };
  }, [preset, sceneVersion]);

  useEffect(() => {
    const runner = runnerRef.current;
    const engine = engineRef.current;
    if (!runner || !engine) return;
    if (running) Runner.run(runner, engine);
    else Runner.stop(runner);
  }, [preset, running, sceneVersion]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.gravity.y = gravity;
  }, [gravity, preset, sceneVersion]);

  function addBall() {
    const engine = engineRef.current;
    if (!engine) return;
    const ball = createBall(90 + Math.random() * (SCENE_WIDTH - 180), 46, ballIndex.current);
    ballIndex.current += 1;
    Composite.add(engine.world, ball);
  }

  function reset() {
    setSceneVersion((value) => value + 1);
    setRunning(true);
  }

  return (
    <div className="fisica-app">
      <header className="fisica-toolbar">
        <div className="fisica-heading">
          <span className="fisica-mark" aria-hidden><Atom size={18} strokeWidth={2} /></span>
          <span>
            <strong>Física 2D</strong>
            <small>Laboratorio de movimiento</small>
          </span>
        </div>
        <div className="fisica-actions">
          <button type="button" onClick={() => setRunning((value) => !value)}>
            {running ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            {running ? "Pausar" : "Reproducir"}
          </button>
          <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden /> Reiniciar</button>
        </div>
      </header>

      <div className="fisica-layout">
        <div className="fisica-stage">
          <div className="fisica-canvas-wrap">
            <canvas ref={canvasRef} className="fisica-canvas" aria-label="Lienzo de simulación de física">
              Tu navegador no puede mostrar el lienzo de física.
            </canvas>
          </div>
          <p className="fisica-hint">Arrastra una pieza para moverla. La escena se reinicia al cambiar de experimento.</p>
        </div>

        <aside className="fisica-side">
          <section className="fisica-controls" aria-label="Controles del experimento">
            <label htmlFor="fisica-preset">Experimento
              <select id="fisica-preset" value={preset} onChange={(event) => { setPreset(event.target.value as PresetId); setRunning(true); }}>
                {PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label htmlFor="fisica-gravity">Gravedad <span>{gravity.toFixed(1)}</span>
              <input id="fisica-gravity" type="range" min="0" max="1.5" step="0.1" value={gravity} onChange={(event) => setGravity(Number(event.target.value))} />
            </label>
            <button type="button" onClick={addBall}><Plus size={15} aria-hidden /> Añadir pelota</button>
          </section>
          <section className="fisica-info" aria-live="polite">
            <h4>{currentPreset.label}</h4>
            <p>{currentPreset.description}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
