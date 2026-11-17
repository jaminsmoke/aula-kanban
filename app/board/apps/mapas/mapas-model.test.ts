import { describe, expect, it } from "vitest";
import {
  PRESETS,
  connectNodes,
  createConceptNode,
  createPresetMap,
  createStarterMap,
  nextNodeId,
  parseMapDocument,
  removeNode,
  serializeMap,
  updateNodeLabel,
} from "./mapas-model";

describe("modelo de Mapas conceptuales", () => {
  it("crea un mapa inicial con tres nodos y dos conexiones", () => {
    const map = createStarterMap();
    expect(map.nodes).toHaveLength(3);
    expect(map.edges).toHaveLength(2);
    expect(map.nodes[0].data.label).toBe("Idea central");
    expect(map.nodes[0].data.kind).toBe("central");
  });

  it("calcula ids y crea nodos de concepto", () => {
    const map = createStarterMap();
    expect(nextNodeId(map.nodes)).toBe("n4");
    const node = createConceptNode(map.nodes, { x: 10, y: 20 }, "Nuevo");
    expect(node.id).toBe("n4");
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.data).toEqual({ label: "Nuevo", kind: "concept" });
  });

  it("elimina un nodo y sus conexiones", () => {
    const map = removeNode(createStarterMap(), "n1");
    expect(map.nodes.map((node) => node.id)).toEqual(["n2", "n3"]);
    expect(map.edges).toHaveLength(0);
  });

  it("actualiza etiquetas sin mutar el mapa original", () => {
    const original = createStarterMap();
    const updated = updateNodeLabel(original, "n2", "Concepto editado");
    expect(updated.nodes[1].data.label).toBe("Concepto editado");
    expect(original.nodes[1].data.label).toBe("Concepto A");
  });

  it("evita conexiones inválidas o duplicadas", () => {
    const map = createStarterMap();
    expect(connectNodes(map, "n2", "n2")).toBe(map);
    expect(connectNodes(map, "n1", "n2")).toBe(map);
    const next = connectNodes(map, "n2", "n3");
    expect(next.edges).toHaveLength(3);
    expect(next.edges[2]).toMatchObject({ source: "n2", target: "n3" });
  });

  it("ofrece una plantilla conceptual y otra mental", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["conceptual", "mental"]);
    expect(createPresetMap("conceptual").nodes).toHaveLength(3);
    const mental = createPresetMap("mental");
    expect(mental.nodes).toHaveLength(5);
    expect(mental.edges).toHaveLength(4);
    expect(mental.nodes[0].data.label).toBe("Tema central");
  });

  it("serializa solo los campos persistibles", () => {
    const map = createStarterMap();
    const dirtyNode = { ...map.nodes[0], selected: true, measured: { width: 10, height: 10 } };
    const saved = serializeMap([dirtyNode, ...map.nodes.slice(1)], map.edges);
    expect(saved.nodes[0]).toEqual({
      id: "n1",
      position: { x: 330, y: 40 },
      data: { label: "Idea central", kind: "central" },
      className: "mapa-nodo mapa-nodo--central",
    });
    expect(saved.edges[0]).toEqual({ id: "e-n1-n2", source: "n1", target: "n2", type: "smoothstep" });
  });

  it("valida y sanea documentos guardados", () => {
    const parsed = parseMapDocument({
      nodes: [
        { id: "a", position: { x: 0, y: 0 }, data: { label: "A", kind: "central" } },
        { id: "b", position: { x: 100, y: 50 }, data: { label: "B" } },
        { id: "roto", position: { x: "no", y: 0 }, data: { label: "X" } },
      ],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "a", target: "fantasma" },
      ],
    });
    expect(parsed?.nodes).toHaveLength(2);
    expect(parsed?.nodes[1].data.kind).toBe("concept");
    expect(parsed?.edges).toEqual([{ id: "e1", source: "a", target: "b", type: "smoothstep" }]);
    expect(parseMapDocument({ nodes: [] })).toBeNull();
    expect(parseMapDocument(null)).toBeNull();
  });
});
