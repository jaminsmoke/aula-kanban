import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowAttemptClose, WindowCloseProvider } from "../../shared/window-close-guard";
import type { VersionedSaveResult } from "../use-app-document";
import MermaidApp from "./mermaid-app";

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  saveVersioned: vi.fn(async (_state: unknown, _expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => ({
    status: "saved",
    updatedAt: 10,
  })),
}));

const rendererMock = vi.hoisted(() => ({
  render: vi.fn(async (_code: string) => "<svg />"),
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    saveVersioned: documentMock.saveVersioned,
    loading: false,
    updatedAt: null,
    error: null,
  }),
}));

vi.mock("./mermaid-render", () => ({
  createMermaidRenderer: () => ({ render: rendererMock.render }),
}));

describe("Diagramas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.saveVersioned.mockResolvedValue({ status: "saved", updatedAt: 10 });
    rendererMock.render.mockResolvedValue("<svg />");
  });

  it("monta el editor, la vista previa y las acciones", async () => {
    const { container } = render(<MermaidApp projectId="p1" role="owner" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));

    expect(screen.getByLabelText("Código del diagrama")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cargar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar SVG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Limpiar" })).toBeTruthy();
    expect(screen.getByText("Vista previa")).toBeTruthy();
    expect(container.querySelectorAll(".mermaid-line-numbers span").length).toBeGreaterThan(1);
    expect(container.querySelector(".mermaid-highlight")?.textContent).toContain("flowchart TD");
  });

  it("muestra el detalle del error y permite saltar a su línea", async () => {
    render(<MermaidApp projectId="p1" role="owner" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));
    rendererMock.render.mockRejectedValueOnce(new Error("Parse error on line 2:\nExpecting NODE_STRING"));

    fireEvent.change(screen.getByLabelText("Código del diagrama"), { target: { value: "graph TD\nA -->" } });

    expect(await screen.findByRole("region", { name: "Detalle del error" })).toBeTruthy();
    const detail = screen.getByRole("region", { name: "Detalle del error" });
    expect(within(detail).getByText(/No se pudo dibujar el diagrama \(línea 2\)/)).toBeTruthy();
    expect(within(detail).getByText(/Expecting NODE_STRING/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ir a la línea 2" }));
    const textarea = screen.getByLabelText("Código del diagrama") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBeGreaterThan(0);
  });

  it("guarda con versión y muestra el estado en la barra", async () => {
    render(<MermaidApp projectId="p1" role="owner" />);
    const editor = screen.getByLabelText("Código del diagrama");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));

    fireEvent.change(editor, { target: { value: "graph TD\n  A --> B" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    expect(documentMock.saveVersioned).toHaveBeenCalledWith({ code: "graph TD\n  A --> B" }, null);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Diagrama guardado"));
  });

  it("bloquea la edición para invitados pero permite exportar", async () => {
    render(<MermaidApp projectId="p1" role="guest" />);
    await waitFor(() => expect(screen.getByRole("status").textContent).not.toContain("Cargando"));

    expect(screen.getByLabelText("Código del diagrama")).toHaveProperty("readOnly", true);
    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Cargar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Limpiar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar SVG" })).toHaveProperty("disabled", false);
    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });

  it("confirma antes de limpiar y descarta solo si se acepta", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MermaidApp projectId="p1" role="owner" />);
    const editor = screen.getByLabelText("Código del diagrama");
    const initial = (editor as HTMLTextAreaElement).value;
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));

    fireEvent.change(editor, { target: { value: "graph LR\n  A --> B" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect((editor as HTMLTextAreaElement).value).toBe("graph LR\n  A --> B");

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect((editor as HTMLTextAreaElement).value).toBe("");
    expect(initial).not.toBe("");
  });

  it("no recarga el servidor si se cancela la confirmación de Cargar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MermaidApp projectId="p1" role="owner" />);
    await waitFor(() => expect(documentMock.load).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Código del diagrama"), { target: { value: "graph LR" } });
    fireEvent.click(screen.getByRole("button", { name: "Cargar" }));

    expect(documentMock.load).toHaveBeenCalledTimes(1);
  });

  it("abre el diálogo de conflicto y permite descargar la copia", async () => {
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 12 });
    render(<MermaidApp projectId="p1" role="owner" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));

    fireEvent.change(screen.getByLabelText("Código del diagrama"), { target: { value: "graph LR" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("dialog", { name: "Conflicto de versión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Conservar la mía" })).toBeTruthy();
  });

  it("avisa antes de cerrar con cambios pendientes", async () => {
    const onClose = vi.fn();
    function CloseTrigger() {
      const attemptClose = useWindowAttemptClose();
      return <button type="button" onClick={attemptClose}>Cerrar ventana</button>;
    }

    render(
      <WindowCloseProvider onClose={onClose}>
        <MermaidApp projectId="p1" role="owner" />
        <CloseTrigger />
      </WindowCloseProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" }).hasAttribute("disabled")).toBe(false));

    fireEvent.change(screen.getByLabelText("Código del diagrama"), { target: { value: "graph LR" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ventana" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "Cambios sin guardar" })).toBeTruthy();
  });
});
