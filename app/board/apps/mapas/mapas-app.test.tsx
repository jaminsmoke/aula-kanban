import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@xyflow/react", async () => {
  const React = await import("react");

  function useNodesState<T>(initial: T[]) {
    const [nodes, setNodes] = React.useState(initial);
    const onNodesChange = React.useCallback((changes: Array<{ type: string; id: string }>) => {
      setNodes((current) => current.filter((node) => {
        const item = node as { id: string };
        return !changes.some((change) => change.type === "remove" && change.id === item.id);
      }));
    }, []);
    return [nodes, setNodes, onNodesChange] as const;
  }

  function useEdgesState<T>(initial: T[]) {
    const [edges, setEdges] = React.useState(initial);
    const onEdgesChange = React.useCallback((changes: Array<{ type: string; id: string }>) => {
      setEdges((current) => current.filter((edge) => {
        const item = edge as { id: string };
        return !changes.some((change) => change.type === "remove" && change.id === item.id);
      }));
    }, []);
    return [edges, setEdges, onEdgesChange] as const;
  }

  return {
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    ReactFlow: ({ children }: { children?: React.ReactNode }) => React.createElement("div", { "data-testid": "flow" }, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    useNodesState,
    useEdgesState,
    useReactFlow: () => ({
      screenToFlowPosition: (position: { x: number; y: number }) => position,
      fitView: vi.fn(),
    }),
    addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
    MarkerType: { ArrowClosed: "arrowclosed" },
  };
});

import MapasApp from "./mapas-app";

describe("Mapas conceptuales", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("añade un nodo, permite editarlo y eliminarlo", () => {
    render(<MapasApp />);
    expect(screen.getByText("3 nodos · 2 conexiones")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Añadir nodo" }));
    expect(screen.getByText("4 nodos · 2 conexiones")).toBeTruthy();

    const input = screen.getByLabelText("Etiqueta del nodo") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Nueva idea" } });
    expect(input.value).toBe("Nueva idea");
    expect(screen.getByRole("status").textContent).toContain("Etiqueta actualizada");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar nodo" }));
    expect(screen.getByText("3 nodos · 2 conexiones")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Nodo y conexiones eliminados");
  });

  it("reinicia el mapa de ejemplo", () => {
    render(<MapasApp />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir nodo" }));
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getByText("3 nodos · 2 conexiones")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Mapa reiniciado");
  });
});
