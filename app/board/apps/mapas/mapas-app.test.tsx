import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    loading: false,
    error: null,
  }),
}));

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
import { createPresetMap } from "./mapas-model";

const props = { projectId: "p1", role: "owner" as const };

describe("Mapas conceptuales", () => {
  afterEach(() => {
    vi.clearAllMocks();
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });

  it("añade un nodo, permite editarlo y eliminarlo", () => {
    render(<MapasApp {...props} />);
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
    render(<MapasApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir nodo" }));
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(screen.getByText("3 nodos · 2 conexiones")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Mapa reiniciado");
  });

  it("carga el mapa guardado al abrir", async () => {
    documentMock.load.mockResolvedValueOnce({ state: createPresetMap("mental"), updatedAt: 1 });
    render(<MapasApp {...props} />);

    await waitFor(() => expect(screen.getByText("5 nodos · 4 conexiones")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Mapa guardado cargado");
  });

  it("aplica una plantilla mental", () => {
    render(<MapasApp {...props} />);
    fireEvent.change(screen.getByLabelText("Tipo de mapa"), { target: { value: "mental" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plantilla" }));

    expect(screen.getByText("5 nodos · 4 conexiones")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Plantilla «Mapa mental» aplicada");
  });

  it("guarda el mapa serializado en el proyecto", async () => {
    render(<MapasApp {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as { nodes: unknown[]; edges: unknown[] };
    expect(saved.nodes).toHaveLength(3);
    expect(saved.edges).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toContain("Mapa guardado en el proyecto");
  });

  it("deja el mapa en solo lectura para invitados", () => {
    render(<MapasApp projectId="p1" role="guest" />);
    expect(screen.getByRole("button", { name: "Añadir nodo" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveProperty("disabled", true);
    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
  });
});
