import type { Edge, Node } from "@xyflow/react";

/** Datos visibles de un nodo del mapa. */
export type MapNodeData = {
  label: string;
  kind: "central" | "concept";
};

/** Nodo del mapa, compatible con React Flow. */
export type MapNode = Node<MapNodeData>;

/** Conexión entre dos nodos. */
export type MapEdge = Edge;

/** Estado serializable de un mapa. */
export type MapDocument = {
  nodes: MapNode[];
  edges: MapEdge[];
};

/**
 * Crea el mapa de ejemplo que se muestra al abrir la app.
 * @returns Tres nodos y dos conexiones iniciales.
 */
export function createStarterMap(): MapDocument {
  const nodes: MapNode[] = [
    {
      id: "n1",
      position: { x: 330, y: 40 },
      data: { label: "Idea central", kind: "central" },
      className: "mapa-nodo mapa-nodo--central",
    },
    {
      id: "n2",
      position: { x: 90, y: 300 },
      data: { label: "Concepto A", kind: "concept" },
      className: "mapa-nodo",
    },
    {
      id: "n3",
      position: { x: 570, y: 300 },
      data: { label: "Concepto B", kind: "concept" },
      className: "mapa-nodo",
    },
  ];

  return {
    nodes,
    edges: [
      { id: "e-n1-n2", source: "n1", target: "n2", type: "smoothstep" },
      { id: "e-n1-n3", source: "n1", target: "n3", type: "smoothstep" },
    ],
  };
}

/**
 * Calcula el siguiente id de nodo a partir de los existentes.
 * @param nodes - Nodos actuales.
 * @returns Un id `n` seguido de un número libre.
 */
export function nextNodeId(nodes: MapNode[]): string {
  const highest = nodes.reduce((max, node) => {
    const match = /^n(\d+)$/.exec(node.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `n${highest + 1}`;
}

/**
 * Crea un nodo de concepto nuevo.
 * @param nodes - Nodos actuales, para calcular el id y la etiqueta.
 * @param position - Posición opcional; si falta, se coloca en cascada.
 * @param label - Etiqueta opcional.
 * @returns El nodo listo para añadir al mapa.
 */
export function createConceptNode(
  nodes: MapNode[],
  position?: { x: number; y: number },
  label?: string,
): MapNode {
  const index = nodes.length;
  return {
    id: nextNodeId(nodes),
    position: position ?? { x: 80 + (index % 4) * 210, y: 300 + Math.floor(index / 4) * 110 },
    data: { label: label ?? `Concepto ${index + 1}`, kind: "concept" },
    className: "mapa-nodo",
  };
}

/**
 * Elimina un nodo y todas sus conexiones.
 * @param map - Mapa de origen.
 * @param id - Id del nodo que se elimina.
 * @returns Un mapa nuevo sin el nodo ni sus conexiones.
 */
export function removeNode(map: MapDocument, id: string): MapDocument {
  return {
    nodes: map.nodes.filter((node) => node.id !== id),
    edges: map.edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}

/**
 * Cambia la etiqueta de un nodo.
 * @param map - Mapa de origen.
 * @param id - Id del nodo.
 * @param label - Etiqueta nueva.
 * @returns Un mapa nuevo con la etiqueta actualizada.
 */
export function updateNodeLabel(map: MapDocument, id: string, label: string): MapDocument {
  return {
    ...map,
    nodes: map.nodes.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, label } } : node
    )),
  };
}

/**
 * Conecta dos nodos si la conexión no existe ya.
 * @param map - Mapa de origen.
 * @param source - Nodo de salida.
 * @param target - Nodo de entrada.
 * @returns Un mapa nuevo o el mismo si la conexión no es válida o ya existe.
 */
export function connectNodes(map: MapDocument, source: string, target: string): MapDocument {
  if (!source || !target || source === target) return map;
  const exists = map.edges.some((edge) => (
    (edge.source === source && edge.target === target)
    || (edge.source === target && edge.target === source)
  ));
  if (exists) return map;
  return {
    ...map,
    edges: [...map.edges, { id: `e-${source}-${target}`, source, target, type: "smoothstep" }],
  };
}
