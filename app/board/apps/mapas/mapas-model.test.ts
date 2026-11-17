import { describe, expect, it } from "vitest";
import {
  connectNodes,
  createConceptNode,
  createStarterMap,
  nextNodeId,
  removeNode,
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
});
