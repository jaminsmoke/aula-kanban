"use client";

import { useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { FolderOpen, Maximize2, Network, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  PRESETS,
  connectNodes,
  createConceptNode,
  createPresetMap,
  parseMapDocument,
  presetInfo,
  removeNode,
  serializeMap,
  updateNodeLabel,
  type MapDocument,
  type MapEdge,
  type MapNode,
  type PresetId,
} from "./mapas-model";
import "./mapas.css";

const STARTER = createPresetMap("conceptual");

/**
 * Mapas conceptuales con nodos y conexiones editables.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con el lienzo y el panel de edición.
 */
export default function MapasApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  return (
    <ReactFlowProvider>
      <MapasEditor projectId={projectId} role={role} />
    </ReactFlowProvider>
  );
}

/**
 * Editor interno; vive dentro del proveedor de React Flow para usar su viewport.
 * @param props - Proyecto activo y rol del usuario.
 * @returns El lienzo editable y sus controles.
 */
function MapasEditor({ projectId, role }: { projectId: string; role: StoreRole }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>(STARTER.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapEdge>(STARTER.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("conceptual");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Cargando mapa…");
  const [loadFailed, setLoadFailed] = useState(false);
  const versionRef = useRef<number | null>(null);
  const { load, saveVersioned, loading, error } = useAppDocument<MapDocument>(projectId, "mapas");
  const readOnly = role === "guest";
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const currentPreset = presetInfo(selectedPreset);

  useEffect(() => {
    let active = true;
    void load().then(({ state, updatedAt, ok }) => {
      if (!active) return;
      if (ok === false) {
        setLoadFailed(true);
        setStatus("No se pudo cargar el mapa. Se conserva el mapa actual.");
        return;
      }
      versionRef.current = updatedAt;
      setLoadFailed(false);
      const parsed = parseMapDocument(state);
      if (parsed) {
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setDirty(false);
        setStatus("Mapa guardado cargado.");
      } else if (state === null) {
        setStatus("Mapa de ejemplo listo. Guarda para conservarlo.");
      } else {
        setLoadFailed(true);
        setStatus("El mapa guardado no es válido. Se conserva el mapa actual.");
      }
    });
    return () => { active = false; };
  }, [load, setEdges, setNodes]);

  function markDirty() {
    setDirty(true);
  }

  function addNode() {
    if (readOnly) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : undefined;
    const node = createConceptNode(
      nodes,
      center ? { x: center.x - 80, y: center.y - 30 } : undefined,
    );
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    markDirty();
    setStatus("Nodo creado. Edita su etiqueta o arrástralo.");
  }

  function handleNodesChange(changes: NodeChange<MapNode>[]) {
    onNodesChange(changes);
    if (changes.some((change) => change.type === "position" || change.type === "remove")) {
      markDirty();
    }
    if (changes.some((change) => change.type === "remove" && change.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }

  function handleEdgesChange(changes: EdgeChange<MapEdge>[]) {
    onEdgesChange(changes);
    if (changes.some((change) => change.type === "remove")) {
      markDirty();
      setSelectedEdgeId(null);
    }
  }

  function handleConnect(connection: Connection) {
    if (readOnly || !connection.source || !connection.target) return;
    const next = connectNodes({ nodes, edges }, connection.source, connection.target);
    if (next.edges.length === edges.length) {
      setStatus("Esa conexión ya existe o no es válida.");
      return;
    }
    const newEdge = next.edges[next.edges.length - 1];
    setEdges((current) => addEdge({
      ...newEdge,
      markerEnd: { type: MarkerType.ArrowClosed },
    }, current));
    markDirty();
    setStatus("Conexión creada entre los dos nodos.");
  }

  function updateLabel(label: string) {
    if (readOnly || !selectedNode) return;
    setNodes((current) => updateNodeLabel({ nodes: current, edges }, selectedNode.id, label).nodes);
    markDirty();
    setStatus("Etiqueta actualizada.");
  }

  function deleteSelection() {
    if (readOnly) return;
    if (selectedNodeId) {
      const next = removeNode({ nodes, edges }, selectedNodeId);
      setNodes(next.nodes);
      setEdges(next.edges);
      setSelectedNodeId(null);
      markDirty();
      setStatus("Nodo y conexiones eliminados.");
      return;
    }
    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      markDirty();
      setStatus("Conexión eliminada.");
    }
  }

  function applyPreset() {
    if (readOnly) return;
    if (dirty && !window.confirm("Se reemplazará el mapa actual. ¿Continuar?")) return;
    const map = createPresetMap(selectedPreset);
    setNodes(map.nodes);
    setEdges(map.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    markDirty();
    setStatus(`Plantilla «${currentPreset.label}» aplicada. Guarda para conservarla.`);
    window.setTimeout(() => fitView({ padding: 0.2 }), 0);
  }

  async function saveMap() {
    if (readOnly) return;
    if (loadFailed) {
      setStatus("No se puede guardar hasta recuperar el mapa guardado.");
      return;
    }
    setSaving(true);
    const result = await saveVersioned(serializeMap(nodes, edges), versionRef.current);
    setSaving(false);
    if (result.status === "saved") {
      versionRef.current = result.updatedAt;
      setDirty(false);
      setStatus("Mapa guardado en el proyecto.");
    } else if (result.status === "conflict") {
      setDirty(true);
      setStatus("El mapa ha cambiado en otra sesión. Tus cambios siguen aquí.");
    } else {
      setStatus("No se pudo guardar el mapa. Revisa la conexión.");
    }
  }

  async function loadMap() {
    if (loading) return;
    if (dirty && typeof window !== "undefined" && !window.confirm(
      "Hay cambios sin guardar. ¿Cargar el mapa guardado y descartar los cambios locales?",
    )) {
      return;
    }
    setStatus("Cargando mapa…");
    const { state, updatedAt, ok } = await load();
    if (ok === false) {
      setLoadFailed(true);
      setStatus("No se pudo cargar el mapa. Se conserva el mapa actual.");
      return;
    }
    const parsed = parseMapDocument(state);
    if (parsed) {
      versionRef.current = updatedAt;
      setLoadFailed(false);
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setDirty(false);
      setStatus("Mapa cargado.");
    } else if (state === null) {
      versionRef.current = null;
      setLoadFailed(false);
      setStatus("No hay un mapa guardado; se mantiene el actual.");
    } else {
      setLoadFailed(true);
      setStatus("El mapa guardado no es válido; se mantiene el actual.");
    }
  }

  function reset() {
    if (readOnly) return;
    const map = createPresetMap(selectedPreset);
    setNodes(map.nodes);
    setEdges(map.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    markDirty();
    setStatus("Mapa reiniciado.");
    window.setTimeout(() => fitView({ padding: 0.2 }), 0);
  }

  function fit() {
    fitView({ padding: 0.2 });
    setStatus("Vista ajustada al mapa.");
  }

  return (
    <div className="mapas-app">
      <header className="mapas-toolbar">
        <div className="mapas-heading">
          <span className="mapas-mark" aria-hidden><Network size={18} strokeWidth={2} /></span>
          <span>
            <strong>Mapas conceptuales</strong>
            <small>Ordena ideas y conecta conceptos</small>
          </span>
        </div>
        <div className="mapas-actions">
          <button type="button" onClick={addNode} disabled={readOnly}><Plus size={15} aria-hidden /> Añadir nodo</button>
          <button type="button" onClick={deleteSelection} disabled={readOnly || (!selectedNode && !selectedEdge)}>
            <Trash2 size={15} aria-hidden /> Eliminar
          </button>
          <button type="button" onClick={saveMap} disabled={readOnly || saving || loading}>
            <Save size={15} aria-hidden /> {saving ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={loadMap} disabled={loading}>
            <FolderOpen size={15} aria-hidden /> Cargar
          </button>
          <button type="button" onClick={fit}><Maximize2 size={15} aria-hidden /> Ajustar vista</button>
          <button type="button" onClick={reset} disabled={readOnly}><RotateCcw size={15} aria-hidden /> Reiniciar</button>
        </div>
      </header>

      <div className="mapas-layout">
        <div className="mapas-stage">
          <div ref={canvasRef} className="mapas-canvas" aria-label="Lienzo de mapas conceptuales">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={readOnly ? undefined : handleConnect}
              onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
              onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
              onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
              onNodesDelete={(deleted) => {
                if (deleted.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null);
                setStatus("Nodo eliminado.");
              }}
              onEdgesDelete={() => { setSelectedEdgeId(null); setStatus("Conexión eliminada."); }}
              nodesDraggable={!readOnly}
              nodesConnectable={!readOnly}
              defaultEdgeOptions={{
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { strokeWidth: 2 },
              }}
              connectionLineStyle={{ strokeWidth: 2 }}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
              minZoom={0.2}
              maxZoom={1.8}
              snapToGrid
              snapGrid={[20, 20]}
              deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            >
              <Background gap={24} size={1} color="#d8d2ee" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <p className="mapas-hint">Arrastra desde el punto de un nodo hasta otro para conectarlos. Selecciona un nodo para cambiar su etiqueta.</p>
        </div>

        <aside className="mapas-side">
          <section className="mapas-info">
            <h4>Mapa</h4>
            <p>{nodes.length} {nodes.length === 1 ? "nodo" : "nodos"} · {edges.length} {edges.length === 1 ? "conexión" : "conexiones"}</p>
            <p className="mapas-dirty">{loading ? "Cargando…" : dirty ? "Cambios sin guardar." : "Sin cambios pendientes."}</p>
            <p className="mapas-status" role="status">{status}</p>
            {error && <p className="mapas-error" role="alert">{error}</p>}
            {readOnly && <p className="mapas-readonly">Modo lectura: no puedes editar ni guardar este mapa.</p>}
          </section>

          <section className="mapas-editor" aria-label="Plantilla del mapa">
            <h4>Plantilla</h4>
            <label htmlFor="mapa-preset">Tipo de mapa</label>
            <select
              id="mapa-preset"
              value={selectedPreset}
              onChange={(event) => setSelectedPreset(event.target.value as PresetId)}
              disabled={readOnly}
            >
              {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
            </select>
            <p className="mapas-muted">{currentPreset.description}</p>
            <button type="button" className="mapas-secondary" onClick={applyPreset} disabled={readOnly}>
              <RotateCcw size={15} aria-hidden /> Aplicar plantilla
            </button>
          </section>

          <section className="mapas-editor" aria-label="Edición de la selección">
            <h4>Selección</h4>
            {selectedNode ? (
              <>
                <label htmlFor="mapa-etiqueta">Etiqueta del nodo</label>
                <input
                  id="mapa-etiqueta"
                  value={selectedNode.data.label}
                  onChange={(event) => updateLabel(event.target.value)}
                  disabled={readOnly}
                />
                <button type="button" className="mapas-secondary" onClick={deleteSelection} disabled={readOnly}>
                  <Trash2 size={15} aria-hidden /> Eliminar nodo
                </button>
              </>
            ) : selectedEdge ? (
              <>
                <p className="mapas-muted">Conexión seleccionada.</p>
                <button type="button" className="mapas-secondary" onClick={deleteSelection} disabled={readOnly}>
                  <Trash2 size={15} aria-hidden /> Eliminar conexión
                </button>
              </>
            ) : (
              <p className="mapas-muted">Selecciona un nodo o una conexión para editarla.</p>
            )}
          </section>

          <section className="mapas-tip">
            <Network size={16} aria-hidden />
            <p>Los nodos se mueven libremente. «Guardar» conserva el mapa en el proyecto; los invitados lo ven en lectura.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
