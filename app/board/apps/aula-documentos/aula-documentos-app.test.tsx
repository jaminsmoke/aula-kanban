import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import AulaDocumentosApp from "./aula-documentos-app";

const documentMock = vi.hoisted(() => ({
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
    loading: false,
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
      if (code.includes("A -->")) throw new Error("Parse error de prueba");
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

    expect(await screen.findByText("Parse error de prueba")).toBeTruthy();
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

  it("mantiene el ejemplo si el documento guardado no cumple el esquema", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { schemaVersion: 99, title: "Roto", content: { type: "doc", content: [] } },
      updatedAt: 2,
    });

    render(<AulaDocumentosApp {...props} />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("versión más nueva"));
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
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
    expect(screen.getByRole("button", { name: "Guardar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: "Negrita" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insertar diagrama Mermaid" })).toBeNull();
    expect(screen.getByLabelText("Contenido del documento").getAttribute("contenteditable")).toBe("false");
  });
});
