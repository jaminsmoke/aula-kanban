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

/** Plantillas de mapa disponibles. */
export type PresetId = "conceptual" | "mental";

/** Ficha visible de una plantilla. */
export type PresetInfo = {
  id: PresetId;
  label: string;
  description: string;
};

/** Plantillas en el orden del selector. */
export const PRESETS: PresetInfo[] = [
  {
    id: "conceptual",
    label: "Mapa conceptual",
    description: "Una idea central y tres conceptos relacionados.",
  },
  {
    id: "mental",
    label: "Mapa mental",
    description: "Un tema central con cuatro ramas alrededor.",
  },
];

/** Límites defensivos al leer un documento guardado. */
const MAX_NODES = 200;
const MAX_EDGES = 400;

/**
 * Crea el mapa de ejemplo que se muestra al abrir la app.
 * @returns Tres nodos y dos conexiones iniciales.
 */
export function createStarterMap(): MapDocument {
  return {
    nodes: [
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
    ],
    edges: [
      { id: "e-n1-n2", source: "n1", target: "n2", type: "smoothstep" },
      { id: "e-n1-n3", source: "n1", target: "n3", type: "smoothstep" },
    ],
  };
}

/**
 * Crea una plantilla de mapa.
 * @param id - Plantilla que se quiere cargar.
 * @returns El mapa inicial de esa plantilla.
 */
export function createPresetMap(id: PresetId): MapDocument {
  if (id === "conceptual") return createStarterMap();

  const central: MapNode = {
    id: "n1",
    position: { x: 330, y: 220 },
    data: { label: "Tema central", kind: "central" },
    className: "mapa-nodo mapa-nodo--central",
  };
  const branches: MapNode[] = [
    { id: "n2", position: { x: 90, y: 220 }, data: { label: "Rama 1", kind: "concept" }, className: "mapa-nodo" },
    { id: "n3", position: { x: 570, y: 220 }, data: { label: "Rama 2", kind: "concept" }, className: "mapa-nodo" },
    { id: "n4", position: { x: 90, y: 420 }, data: { label: "Rama 3", kind: "concept" }, className: "mapa-nodo" },
    { id: "n5", position: { x: 570, y: 420 }, data: { label: "Rama 4", kind: "concept" }, className: "mapa-nodo" },
  ];
  return {
    nodes: [central, ...branches],
    edges: branches.map((branch) => ({
      id: `e-n1-${branch.id}`,
      source: "n1",
      target: branch.id,
      type: "smoothstep",
    })),
  };
}

/**
 * Ficha de una plantilla.
 * @param id - Identificador de la plantilla.
 * @returns La ficha correspondiente o la primera.
 */
export function presetInfo(id: PresetId): PresetInfo {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
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

/**
 * Reduce los nodos y conexiones a los campos que se guardan.
 * @param nodes - Nodos actuales de React Flow.
 * @param edges - Conexiones actuales.
 * @returns Un documento limpio y serializable.
 */
export function serializeMap(nodes: MapNode[], edges: MapEdge[]): MapDocument {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: { label: node.data.label, kind: node.data.kind },
      className: node.data.kind === "central" ? "mapa-nodo mapa-nodo--central" : "mapa-nodo",
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
    })),
  };
}

/**
 * Valida y normaliza un documento guardado.
 * @param value - Valor leído de `app_documents`.
 * @returns El mapa saneado o `null` si no tiene nodos válidos.
 */
export function parseMapDocument(value: unknown): MapDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(record.nodes)) return null;

  const nodes = record.nodes.slice(0, MAX_NODES).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const node = item as { id?: unknown; position?: unknown; data?: unknown };
    const data = node.data as { label?: unknown; kind?: unknown } | undefined;
    const position = node.position as { x?: unknown; y?: unknown } | undefined;
    if (
      typeof node.id !== "string"
      || !node.id
      || typeof data?.label !== "string"
      || typeof position?.x !== "number"
      || typeof position?.y !== "number"
      || !Number.isFinite(position.x)
      || !Number.isFinite(position.y)
    ) return [];
    const kind: MapNodeData["kind"] = data.kind === "central" ? "central" : "concept";
    return [{
      id: node.id,
      position: { x: position.x, y: position.y },
      data: { label: data.label, kind },
      className: kind === "central" ? "mapa-nodo mapa-nodo--central" : "mapa-nodo",
    }];
  });

  if (!nodes.length) return null;
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeIds = new Set<string>();
  const edges = (Array.isArray(record.edges) ? record.edges : []).slice(0, MAX_EDGES).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const edge = item as { id?: unknown; source?: unknown; target?: unknown };
    if (
      typeof edge.id !== "string"
      || typeof edge.source !== "string"
      || typeof edge.target !== "string"
      || edgeIds.has(edge.id)
      || !nodeIds.has(edge.source)
      || !nodeIds.has(edge.target)
      || edge.source === edge.target
    ) return [];
    edgeIds.add(edge.id);
    return [{ id: edge.id, source: edge.source, target: edge.target, type: "smoothstep" }];
  });

  return { nodes, edges };
}
