import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { useWindowAttemptClose, WindowCloseProvider } from "../../store/window-close-guard";
import AulaDocumentosApp, { AUTOSAVE_DELAY_MS } from "./aula-documentos-app";

/**
 * Botón de prueba que intenta cerrar la ventana como el control real.
 * @returns El botón de cierre.
 */
function CloseTrigger() {
  const attemptClose = useWindowAttemptClose();
  return <button type="button" onClick={attemptClose}>Probar cierre</button>;
}

const documentMock = vi.hoisted(() => ({
  loading: false as boolean,
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
  notesLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  mermaidLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  presentationsLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
}));

const mermaidMock = vi.hoisted(() => ({
  render: vi.fn(async (code: string) => `<svg data-mermaid-preview="true"><text>${code}</text></svg>`),
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: (_projectId: string, appId: string) => ({
    load: appId === "documentos"
      ? documentMock.notesLoad
      : appId === "mermaid"
        ? documentMock.mermaidLoad
        : appId === "presentaciones"
          ? documentMock.presentationsLoad
          : documentMock.load,
    save: documentMock.save,
    loading: documentMock.loading,
    error: null,
  }),
}));

vi.mock("../../shared/aula-documentos/mermaid-renderer", () => ({
  getMermaidRenderer: () => mermaidMock,
  createMermaidRenderer: () => mermaidMock,
  normalizeMermaidSvg: (svg: string) => svg,
}));

const props = { projectId: "p1", role: "owner" as const };

/**
 * Cuenta bloques Mermaid en un JSON de documento.
 * @param content - Contenido Tiptap.
 * @returns Número de bloques.
 */
function countMermaid(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const node = content as { type?: string; content?: unknown[] };
  const children = Array.isArray(node.content) ? node.content : [];
  return (node.type === "mermaidBlock" ? 1 : 0)
    + children.reduce<number>((total, child) => total + countMermaid(child), 0);
}

describe("Aula Documentos", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    documentMock.loading = false;
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
    documentMock.notesLoad.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.mermaidLoad.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.presentationsLoad.mockResolvedValue({ state: null, updatedAt: null });
    mermaidMock.render.mockImplementation(async (code: string) => `<svg data-mermaid-preview="true"><text>${code}</text></svg>`);
  });

  it("monta el título, el editor y las acciones principales", async () => {
    render(<AulaDocumentosApp {...props} />);

    expect(screen.getByText("Aula Documentos")).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
    expect(screen.getByRole("toolbar", { name: "Formato del documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negrita" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insertar diagrama Mermaid" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toBeTruthy();

    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Documento de ejemplo listo");
    expect(screen.getByText("0 diagramas")).toBeTruthy();
  });

  it("no guarda automáticamente un documento limpio", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    expect(documentMock.save).not.toHaveBeenCalled();
  });

  it("agrupa varias ediciones en un solo autosave", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    const insert = screen.getByRole("button", { name: "Insertar diagrama Mermaid" });
    fireEvent.click(insert);
    fireEvent.click(insert);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(countMermaid(saved.content)).toBe(2);
    expect(screen.getByRole("status").textContent).toContain("guardado automáticamente");
    expect(screen.getByText(/Guardado \d{2}:\d{2}/)).toBeTruthy();
  });

  it("guarda con Ctrl+S sin esperar al autosave", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toContain("guardado en el proyecto");
  });

  it("mantiene el documento sucio y permite reintentar si falla el guardado", async () => {
    documentMock.save.mockResolvedValueOnce(false);
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("No se pudo guardar"));
    expect(screen.getByText("Error al guardar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar guardado" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("status").textContent).toContain("guardado en el proyecto");
  });

  it("no guarda mientras el documento se está cargando", async () => {
    documentMock.loading = true;
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    expect(documentMock.save).not.toHaveBeenCalled();
  });

  it("guarda un borrador Mermaid sin pulsar Aplicar", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const nextCode = "flowchart TD\nX --> Y";
    fireEvent.change(screen.getByLabelText("Código Mermaid"), { target: { value: nextCode } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(nextCode);
  });

  it("autoguarda el borrador Mermaid sin cerrar el editor", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const nextCode = "flowchart LR\nAntes --> Después";
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Código Mermaid"), { target: { value: nextCode } });
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Código Mermaid")).toHaveProperty("value", nextCode);
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(nextCode);
  });

  it("guarda con Ctrl+S mientras se edita un diagrama", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const nextCode = "flowchart TD\nCtrl --> S";
    const textarea = screen.getByLabelText("Código Mermaid");
    fireEvent.change(textarea, { target: { value: nextCode } });
    fireEvent.keyDown(textarea, { key: "s", ctrlKey: true });

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(nextCode);
    expect(screen.getByLabelText("Código Mermaid")).toHaveProperty("value", nextCode);
  });

  it("aplica el borrador Mermaid al salir del textarea", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const nextCode = "flowchart TD\nSalida --> Aplicada";
    const textarea = screen.getByLabelText("Código Mermaid");
    fireEvent.change(textarea, { target: { value: nextCode } });
    fireEvent.blur(textarea, { relatedTarget: screen.getByRole("button", { name: "Guardar documento" }) });

    await waitFor(() => expect(screen.queryByLabelText("Código Mermaid")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(nextCode);
  });

  it("descarta el borrador Mermaid y conserva el código anterior", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const original = (screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value;

    fireEvent.change(screen.getByLabelText("Código Mermaid"), {
      target: { value: "flowchart TD\nBorrador --> Descartado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.queryByLabelText("Código Mermaid")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(original);
  });

  it("crea un documento vacío desde el selector de plantillas", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(screen.getByRole("dialog", { name: "Nuevo documento" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Documento vacío/ }));

    expect(screen.getByRole("heading", { name: "Documento sin título" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Crear documento" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento sin título"));
    expect(screen.queryByRole("dialog", { name: "Nuevo documento" })).toBeNull();
  });

  it("advierte de cambios sin guardar y cancelar conserva el documento", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambios pendientes" } });

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(screen.getByText("Hay cambios sin guardar en el documento actual.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Apuntes de clase/ }));
    expect(screen.getByText("Hay cambios sin guardar. Se sustituirán por el contenido de esta plantilla.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Cambios pendientes");
  });

  it("crea un documento desde una plantilla con diagrama y lo guarda", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    fireEvent.click(screen.getByRole("button", { name: /Proyecto de clase/ }));
    fireEvent.click(screen.getByRole("button", { name: "Crear documento" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Proyecto de clase"));
    expect(screen.getByText("Diagrama Mermaid")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.title).toBe("Proyecto de clase");
    expect(saved.content.content?.some((node) => node.type === "mermaidBlock")).toBe(true);
  });

  it("inserta una plantilla Mermaid con confirmación si ya hay código", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const select = screen.getByLabelText("Insertar plantilla Mermaid");
    expect(select.querySelectorAll("option")).toHaveLength(8);
    const original = (screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value;

    fireEvent.change(select, { target: { value: "secuencia" } });
    expect((screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value).toBe(original);

    confirm.mockReturnValue(true);
    fireEvent.change(select, { target: { value: "secuencia" } });
    expect((screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value).toContain("sequenceDiagram");
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });

  it("restaura la última versión válida de un diagrama", async () => {
    mermaidMock.render.mockImplementation(async (code: string) => {
      if (code.includes("BORRAR")) throw new Error("Parse error on line 2:\nBORRAR");
      return `<svg data-mermaid-preview="true"><text>${code}</text></svg>`;
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await waitFor(() => expect(document.querySelector(".aula-mermaid-svg")).toBeTruthy());
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const original = (screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value;

    fireEvent.change(screen.getByLabelText("Código Mermaid"), {
      target: { value: "flowchart TD\nBORRAR" },
    });
    expect(await screen.findByText("No se pudo dibujar el diagrama (línea 2).")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar última versión válida del diagrama" }));

    expect((screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value).toBe(original);
  });

  it("descarta el borrador aunque el autosave ya lo haya aplicado", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await waitFor(() => expect(document.querySelector(".aula-mermaid-svg")).toBeTruthy());
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const original = (screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value;

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText("Código Mermaid"), {
      target: { value: "flowchart TD\nAutosave --> Temporal" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(document.querySelector(".aula-mermaid-block")?.getAttribute("data-mermaid-code")).toBe(original));
  });

  it("copia el código Mermaid del bloque", async () => {
    const writeText = vi.fn(async (_value: string) => {});
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(screen.getByRole("button", { name: "Copiar código Mermaid" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("flowchart TD");
  });

  it("inserta dos diagramas y guarda el documento validado", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const insert = screen.getByRole("button", { name: "Insertar diagrama Mermaid" });
    fireEvent.click(insert);
    fireEvent.click(insert);
    await waitFor(() => expect(screen.getAllByText("Diagrama Mermaid")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));

    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.schemaVersion).toBe(1);
    expect(saved.title).toBe("Documento de ejemplo");
    expect(countMermaid(saved.content)).toBe(2);
    expect(screen.getByRole("status").textContent).toContain("guardado en el proyecto");
  });

  it("mueve un diagrama y conserva el orden al guardar", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: {
        schemaVersion: 1,
        title: "Orden",
        content: {
          type: "doc",
          content: [
            { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
            { type: "mermaidBlock", attrs: { code: "flowchart LR\nC --> D" } },
          ],
        },
      },
      updatedAt: 2,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Mover diagrama arriba" })).toHaveLength(2));

    const moves = screen.getAllByRole("button", { name: "Mover diagrama arriba" });
    expect(moves[0]).toHaveProperty("disabled", true);
    expect(moves[1]).toHaveProperty("disabled", false);
    fireEvent.click(moves[1]);

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const blocks = saved.content.content ?? [];
    expect(blocks[0]).toMatchObject({ type: "mermaidBlock", attrs: { code: "flowchart LR\nC --> D" } });
    expect(blocks[1]).toMatchObject({ type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } });
  });

  it("muestra el error de sintaxis y permite eliminar el bloque", async () => {
    mermaidMock.render.mockImplementation(async (code: string) => {
      if (code.includes("A -->")) throw new Error("Parse error on line 3:\nA -->\nExpecting NODE_STRING");
      return `<svg data-mermaid-preview="true"><text>${code}</text></svg>`;
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar diagrama Mermaid" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Código Mermaid"), {
      target: { value: "flowchart LR\nA -->" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(await screen.findByText("No se pudo dibujar el diagrama (línea 3).")).toBeTruthy();
    expect(screen.getByText(/Expecting NODE_STRING/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar diagrama" }));
    await waitFor(() => expect(screen.queryByText("Diagrama Mermaid")).toBeNull());
  });

  it("carga un documento guardado con diagrama", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: {
        schemaVersion: 1,
        title: "Documento recuperado",
        content: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Texto recuperado." }] },
            { type: "mermaidBlock", attrs: { code: "flowchart TD\nA --> B" } },
          ],
        },
      },
      updatedAt: 2,
    });

    render(<AulaDocumentosApp {...props} />);

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento recuperado"));
    expect(screen.getByRole("status").textContent).toContain("guardado cargado");
    expect(await screen.findByText("Diagrama Mermaid")).toBeTruthy();
    expect(screen.getByText("1 diagrama")).toBeTruthy();
  });

  it("mantiene el ejemplo y ofrece recuperación si el documento guardado no cumple el esquema", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { schemaVersion: 99, title: "Roto", content: { type: "doc", content: [] } },
      updatedAt: 2,
    });

    render(<AulaDocumentosApp {...props} />);

    expect(await screen.findByRole("dialog", { name: "Documento guardado inválido" })).toBeTruthy();
    expect(screen.getByText(/versión más nueva/)).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
    expect(documentMock.save).not.toHaveBeenCalled();
  });

  it("reinicia un documento inválido solo con confirmación explícita", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { schemaVersion: 99, title: "Roto", content: { type: "doc", content: [] } },
      updatedAt: 2,
    });

    render(<AulaDocumentosApp {...props} />);
    await screen.findByRole("dialog", { name: "Documento guardado inválido" });

    fireEvent.click(screen.getByRole("button", { name: "Empezar de cero" }));
    expect(screen.getByText(/perderás esta copia/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar y empezar de cero" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Documento guardado inválido" })).toBeNull());
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento sin título");
  });

  it("protege el cierre y permite cancelar, guardar o descartar", async () => {
    const onClose = vi.fn();
    render(
      <WindowCloseProvider onClose={onClose}>
        <AulaDocumentosApp {...props} />
        <CloseTrigger />
      </WindowCloseProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambios pendientes" } });
    fireEvent.click(screen.getByRole("button", { name: "Probar cierre" }));
    expect(screen.getByRole("dialog", { name: "Cerrar Aula Documentos" })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Cerrar Aula Documentos" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Probar cierre" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sin guardar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Probar cierre" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar y cerrar" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it("avisa antes de descargar la página con cambios pendientes", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Antes de recargar" } });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("importa Notas y documentos con vista previa y confirmación", async () => {
    documentMock.notesLoad.mockResolvedValueOnce({
      state: {
        title: "Notas importadas",
        content: {
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Texto importado." }],
          }],
        },
      },
      updatedAt: 1,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));

    expect(screen.getByRole("dialog", { name: "Importar documento" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Notas y documentos/ }));

    expect(await screen.findByRole("heading", { name: "Notas importadas" })).toBeTruthy();
    expect(screen.getByText(/Texto importado/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que se reemplaza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Notas importadas"));
    expect(screen.getByRole("status").textContent).toContain("Documento importado desde Notas y documentos");
    expect(documentMock.save).not.toHaveBeenCalled();
  });

  it("inserta un salto de diapositiva y lo guarda", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Insertar salto de diapositiva" }));
    expect(await screen.findByText("Salto de diapositiva")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.content.content?.some((node) => node.type === "slideBreak")).toBe(true);
  });

  it("muestra origen, fecha y aviso al importar Notas con H1 duplicado", async () => {
    documentMock.notesLoad.mockResolvedValueOnce({
      state: {
        title: "Notas de clase",
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "  notas DE CLASE " }] },
            { type: "paragraph", content: [{ type: "text", text: "Contenido." }] },
          ],
        },
      },
      updatedAt: Date.UTC(2026, 10, 18, 10, 30),
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));
    fireEvent.click(screen.getByRole("button", { name: /Notas y documentos/ }));

    expect(await screen.findByRole("heading", { name: "Notas de clase" })).toBeTruthy();
    expect(screen.getByText("Se quitó el H1 inicial porque repetía el título.")).toBeTruthy();
    expect(screen.getByText(/Actualizado en el origen:/)).toBeTruthy();
    expect(screen.getByText("Notas y documentos")).toBeTruthy();
  });

  it("indica cuando el origen no tiene fecha al importar Diagramas", async () => {
    documentMock.mermaidLoad.mockResolvedValueOnce({
      state: { code: "flowchart TD\nA --> B" },
      updatedAt: null,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));
    fireEvent.click(screen.getByRole("button", { name: /Diagramas/ }));

    expect(await screen.findByRole("heading", { name: "Diagrama importado" })).toBeTruthy();
    expect(screen.getByText("Fecha de origen no disponible.")).toBeTruthy();
    expect(screen.getByText("Diagramas")).toBeTruthy();
  });

  it("muestra un error legible si el origen no se puede convertir", async () => {
    documentMock.notesLoad.mockResolvedValueOnce({
      state: { title: 3, content: {} },
      updatedAt: null,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));
    fireEvent.click(screen.getByRole("button", { name: /Notas y documentos/ }));

    expect(await screen.findByText("El documento de Notas y documentos no tiene un título válido.")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /Entiendo que se reemplaza/ })).toBeNull();
  });

  it("importa Presentaciones y conserva sus saltos", async () => {
    documentMock.presentationsLoad.mockResolvedValueOnce({
      state: {
        markdown: "# Presentación\n\nIntro\n\n---\n\n## Idea\n\n- Uno\n- Dos",
      },
      updatedAt: 1,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));
    fireEvent.click(screen.getByRole("button", { name: /Presentaciones/ }));

    expect(await screen.findByRole("heading", { name: "Presentación" })).toBeTruthy();
    expect(screen.getByText(/1 salto de diapositiva/)).toBeTruthy();
  });

  it("importa un Markdown con vista previa", async () => {
    const file = {
      name: "clase.md",
      size: 24,
      text: async () => "# Clase\n\nTexto desde Markdown.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Importar documento" }));
    fireEvent.change(screen.getByLabelText(/Archivo Markdown/), {
      target: { files: [file] },
    });

    expect(await screen.findByRole("heading", { name: "Clase" })).toBeTruthy();
    expect(screen.getByText(/Texto desde Markdown/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que se reemplaza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Clase"));
    expect(screen.getByRole("status").textContent).toContain("Documento importado desde Markdown");
  });

  it("deja el documento en solo lectura para invitados", async () => {
    render(<AulaDocumentosApp projectId="p1" role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("readOnly", true);
    expect(screen.getByRole("button", { name: "Nuevo documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Importar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Guardar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: "Negrita" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insertar diagrama Mermaid" })).toBeNull();
    expect(screen.getByLabelText("Contenido del documento").getAttribute("contenteditable")).toBe("false");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(documentMock.save).not.toHaveBeenCalled();
  });
});
