"use client";

import { useRef, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type NodeChange,
} from "@xyflow/react";
import { Maximize2, Network, Plus, RotateCcw, Trash2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import {
  connectNodes,
  createConceptNode,
  createStarterMap,
  removeNode,
  updateNodeLabel,
  type MapEdge,
  type MapNode,
} from "./mapas-model";
import "./mapas.css";

const STARTER = createStarterMap();

/**
 * Mapas conceptuales con nodos y conexiones editables.
 * @returns La ventana con el lienzo y el panel de edición.
 */
export default function MapasApp() {
  return (
    <ReactFlowProvider>
      <MapasEditor />
    </ReactFlowProvider>
  );
}

/**
 * Editor interno; vive dentro del proveedor de React Flow para usar su viewport.
 * @returns El lienzo editable y sus controles.
 */
function MapasEditor() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>(STARTER.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapEdge>(STARTER.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [status, setStatus] = useState("Arrastra un nodo o crea uno nuevo.");
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  function addNode() {
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
    setStatus("Nodo creado. Edita su etiqueta o arrástralo.");
  }

  function handleNodesChange(changes: NodeChange<MapNode>[]) {
    onNodesChange(changes);
    if (changes.some((change) => change.type === "remove" && change.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
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
    setStatus("Conexión creada entre los dos nodos.");
  }

  function updateLabel(label: string) {
    if (!selectedNode) return;
    setNodes((current) => updateNodeLabel({ nodes: current, edges }, selectedNode.id, label).nodes);
    setStatus("Etiqueta actualizada.");
  }

  function deleteSelection() {
    if (selectedNodeId) {
      const next = removeNode({ nodes, edges }, selectedNodeId);
      setNodes(next.nodes);
      setEdges(next.edges);
      setSelectedNodeId(null);
      setStatus("Nodo y conexiones eliminados.");
      return;
    }
    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      setStatus("Conexión eliminada.");
    }
  }

  function reset() {
    setNodes(STARTER.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
    })));
    setEdges(STARTER.edges.map((edge) => ({ ...edge })));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
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
          <button type="button" onClick={addNode}><Plus size={15} aria-hidden /> Añadir nodo</button>
          <button type="button" onClick={deleteSelection} disabled={!selectedNode && !selectedEdge}>
            <Trash2 size={15} aria-hidden /> Eliminar
          </button>
          <button type="button" onClick={fit}><Maximize2 size={15} aria-hidden /> Ajustar vista</button>
          <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden /> Reiniciar</button>
        </div>
      </header>

      <div className="mapas-layout">
        <div className="mapas-stage">
          <div ref={canvasRef} className="mapas-canvas" aria-label="Lienzo de mapas conceptuales">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
              onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
              onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
              onNodesDelete={(deleted) => {
                if (deleted.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null);
                setStatus("Nodo eliminado.");
              }}
              onEdgesDelete={() => { setSelectedEdgeId(null); setStatus("Conexión eliminada."); }}
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
              deleteKeyCode={["Backspace", "Delete"]}
            >
              <Background gap={24} size={1} color="#d8d2ee" />
              <Controls showInteractive={false} />
              <MiniMap className="mapas-minimap" pannable zoomable />
            </ReactFlow>
          </div>
          <p className="mapas-hint">Arrastra desde el punto de un nodo hasta otro para conectarlos. Selecciona un nodo para cambiar su etiqueta.</p>
        </div>

        <aside className="mapas-side">
          <section className="mapas-info">
            <h4>Mapa</h4>
            <p>{nodes.length} {nodes.length === 1 ? "nodo" : "nodos"} · {edges.length} {edges.length === 1 ? "conexión" : "conexiones"}</p>
            <p className="mapas-status" role="status">{status}</p>
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
                />
                <button type="button" className="mapas-secondary" onClick={deleteSelection}>
                  <Trash2 size={15} aria-hidden /> Eliminar nodo
                </button>
              </>
            ) : selectedEdge ? (
              <>
                <p className="mapas-muted">Conexión seleccionada.</p>
                <button type="button" className="mapas-secondary" onClick={deleteSelection}>
                  <Trash2 size={15} aria-hidden /> Eliminar conexión
                </button>
              </>
            ) : (
              <p className="mapas-muted">Selecciona un nodo o una conexión para editarla.</p>
            )}
          </section>

          <section className="mapas-tip">
            <Network size={16} aria-hidden />
            <p>Los nodos se mueven libremente. Las conexiones siguen a sus nodos y el mapa se puede recorrer con zoom y paneo.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
