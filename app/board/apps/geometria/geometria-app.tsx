"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JXG from "jsxgraph";
import { Circle, Compass, Minus, Pencil, RotateCcw, Ruler, Sparkles, Type } from "lucide-react";
import { distance, formatDistance, pointName } from "./geometria-model";
import "./geometria.css";

type Tool = "select" | "point";
type Board = JXG.Board;
type Point = JXG.Point;

/**
 * Geometría interactiva con construcciones básicas y medidas dinámicas.
 * @returns La ventana con el lienzo y la barra de herramientas.
 */
export default function GeometriaApp() {
  const boardRef = useRef<Board | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const elementsRef = useRef<JXG.GeometryElement[]>([]);
  const toolRef = useRef<Tool>("select");
  const [tool, setTool] = useState<Tool>("select");
  const [status, setStatus] = useState("Arrastra A o B, o crea una construcción nueva.");
  const [pointCount, setPointCount] = useState(2);
  const [elementCount, setElementCount] = useState(1);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    const id = "jsxgraph-styles";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/jsxgraph/jsxgraph.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => { toolRef.current = tool; }, [tool]);

  const addPointAt = useCallback((x: number, y: number, name?: string): Point | null => {
    const board = boardRef.current;
    if (!board) return null;
    const point = board.create("point", [x, y], {
      name: name ?? pointName(pointsRef.current.length),
      size: 5,
      face: "circle",
      fillColor: "#7c5cff",
      strokeColor: "#ffffff",
      highlightFillColor: "#2f9e8f",
      withLabel: true,
      label: { fontSize: 14, color: "#1c2a5a" },
    });
    pointsRef.current.push(point);
    return point;
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const board = JXG.JSXGraph.initBoard(box, {
      boundingbox: [-6, 4, 6, -4],
      axis: true,
      grid: true,
      showNavigation: false,
      showCopyright: false,
      keepAspectRatio: true,
    });
    boardRef.current = board;
    pointsRef.current = [];
    elementsRef.current = [];

    const a = addPointAt(-3, 1, "A");
    const b = addPointAt(2, 1, "B");
    if (a && b) {
      const segment = board.create("segment", [a, b], {
        strokeColor: "#7c5cff",
        strokeWidth: 3,
        highlightStrokeColor: "#2f9e8f",
      });
      elementsRef.current.push(segment);
    }

    const onDown = (event: unknown) => {
      if (toolRef.current !== "point") return;
      const [x, y] = board.getUsrCoordsOfMouse(event);
      addPointAt(x, y);
      setPointCount(pointsRef.current.length);
      setTool("select");
      setStatus("Punto creado. Arrástralo o elige otra construcción.");
    };
    board.on("down", onDown);

    return () => {
      JXG.JSXGraph.freeBoard(board);
      boardRef.current = null;
      pointsRef.current = [];
      elementsRef.current = [];
    };
  }, [addPointAt, resetVersion]);

  function lastTwo(): [Point, Point] | null {
    const points = pointsRef.current;
    if (points.length < 2) {
      setStatus("Necesitas al menos dos puntos. Crea otro con Punto.");
      return null;
    }
    return [points[points.length - 2], points[points.length - 1]];
  }

  function pushElement(element: JXG.GeometryElement) {
    elementsRef.current.push(element);
    setElementCount(elementsRef.current.length);
  }

  function addSegment() {
    const board = boardRef.current;
    const pair = lastTwo();
    if (!board || !pair) return;
    pushElement(board.create("segment", pair, { strokeColor: "#7c5cff", strokeWidth: 3, highlightStrokeColor: "#2f9e8f" }));
    setStatus("Segmento creado entre los dos últimos puntos.");
  }

  function addLine() {
    const board = boardRef.current;
    const pair = lastTwo();
    if (!board || !pair) return;
    pushElement(board.create("line", pair, { strokeColor: "#2f9e8f", strokeWidth: 2, straightFirst: true, straightLast: true }));
    setStatus("Recta creada entre los dos últimos puntos.");
  }

  function addCircle() {
    const board = boardRef.current;
    const pair = lastTwo();
    if (!board || !pair) return;
    pushElement(board.create("circle", pair, { strokeColor: "#e5a62e", strokeWidth: 3, fillColor: "#e5a62e", fillOpacity: 0.08 }));
    setStatus("Circunferencia creada: el primer punto es el centro.");
  }

  function addLabel() {
    const board = boardRef.current;
    if (!board) return;
    const last = pointsRef.current[pointsRef.current.length - 1];
    const x = last ? last.X() + 0.35 : 0;
    const y = last ? last.Y() + 0.35 : 2;
    pushElement(board.create("text", [x, y, "Etiqueta"], { fontSize: 15, color: "#1c2a5a", strokeColor: "#1c2a5a" }));
    setStatus("Etiqueta añadida; puedes arrastrarla.");
  }

  function addMeasure() {
    const board = boardRef.current;
    const pair = lastTwo();
    if (!board || !pair) return;
    const [a, b] = pair;
    const label = board.create("text", [
      () => (a.X() + b.X()) / 2,
      () => (a.Y() + b.Y()) / 2 + 0.3,
      () => `d = ${formatDistance(distance(a.X(), a.Y(), b.X(), b.Y()))}`,
    ], { fontSize: 14, color: "#a13a5b", strokeColor: "#a13a5b", anchorX: "middle" });
    pushElement(label);
    setStatus("Medida dinámica añadida; se actualiza al arrastrar.");
  }

  function reset() {
    setPointCount(2);
    setElementCount(1);
    setResetVersion((value) => value + 1);
    setTool("select");
    setStatus("Lienzo reiniciado.");
  }

  function choosePoint() {
    setTool("point");
    setStatus("Haz clic en el lienzo para colocar un punto.");
  }

  return (
    <div className="geometria-app">
      <header className="geometria-toolbar">
        <div className="geometria-heading">
          <span className="geometria-mark" aria-hidden><Compass size={18} strokeWidth={2} /></span>
          <span>
            <strong>Geometría interactiva</strong>
            <small>Construye, mide y experimenta</small>
          </span>
        </div>
        <div className="geometria-actions">
          <button type="button" className={tool === "point" ? "is-active" : ""} onClick={choosePoint} aria-pressed={tool === "point"}>
            <Sparkles size={15} aria-hidden /> Punto
          </button>
          <button type="button" onClick={addSegment}><Minus size={15} aria-hidden /> Segmento</button>
          <button type="button" onClick={addLine}><Ruler size={15} aria-hidden /> Recta</button>
          <button type="button" onClick={addCircle}><Circle size={15} aria-hidden /> Círculo</button>
          <button type="button" onClick={addLabel}><Type size={15} aria-hidden /> Etiqueta</button>
          <button type="button" onClick={addMeasure}><Ruler size={15} aria-hidden /> Medir</button>
          <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden /> Reiniciar</button>
        </div>
      </header>

      <div className="geometria-layout">
        <div className="geometria-stage">
          <div ref={boxRef} className="geometria-board" aria-label="Lienzo de geometría interactiva" />
          <p className="geometria-hint">Crea puntos y construcciones; arrastra los puntos para ver cómo cambian las medidas.</p>
        </div>
        <aside className="geometria-side">
          <section className="geometria-info">
            <h4>Construcción</h4>
            <p>{pointCount} {pointCount === 1 ? "punto" : "puntos"} · {elementCount} {elementCount === 1 ? "elemento" : "elementos"}</p>
            <p className="geometria-status" role="status">{status}</p>
          </section>
          <section className="geometria-tip">
            <Pencil size={16} aria-hidden />
            <p>Los dos últimos puntos se usan para segmentos, rectas, círculos y medidas.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
