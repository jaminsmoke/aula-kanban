import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import {
  CloseTrigger,
  chooseMenu,
  countMermaid,
  documentMock,
  importDocument,
  insertMermaid,
  mermaidMock,
  officeImportMock,
  props,
  resetAulaDocumentMocks,
  savedDocument,
  WindowCloseProvider,
} from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp from "./aula-documentos-app";

describe("Documentos, importación y cierre de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("inserta dos diagramas y guarda el documento validado", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    insertMermaid();
    insertMermaid();
    await waitFor(() => expect(screen.getAllByText("Diagrama Mermaid")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));

    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.schemaVersion).toBe(3);
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
    insertMermaid();
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
    expect(await screen.findByRole("dialog", { name: "Cerrar Aula Documentos" })).toBeTruthy();
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

  it("previsualiza el mismo flujo por arrastre y por pegado", async () => {
    const dropped = {
      name: "arrastrado.md",
      size: 34,
      type: "text/markdown",
      text: async () => "# Documento arrastrado\n\nTexto arrastrado.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    importDocument();
    const dropzone = screen.getByText("Arrastra un archivo aquí").closest("label");
    expect(dropzone).toBeTruthy();
    fireEvent.drop(dropzone as HTMLElement, { dataTransfer: { files: [dropped] } });

    expect(await screen.findByRole("heading", { name: "Documento arrastrado" })).toBeTruthy();
    expect(screen.getByText(/Texto arrastrado/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    fireEvent.change(screen.getByLabelText("Pegar texto o Markdown"), {
      target: { value: "# Documento pegado\n\nTexto pegado." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Previsualizar texto" }));

    expect(await screen.findByRole("heading", { name: "Documento pegado" })).toBeTruthy();
    expect(screen.getByText(/Texto pegado\./, { selector: ".aula-documentos-import-excerpt" })).toBeTruthy();
  });

  it("importa TXT literal y JSON canónico y rechaza HTML", async () => {
    const txt = {
      name: "notas.txt",
      size: 34,
      type: "text/plain",
      text: async () => "# No es título\n\n*Tampoco* es énfasis.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    importDocument();
    fireEvent.change(document.getElementById("aula-documentos-import-file") as HTMLInputElement, {
      target: { files: [txt] },
    });

    expect(await screen.findByRole("heading", { name: "notas" })).toBeTruthy();
    expect(screen.getByText(/No es título/)).toBeTruthy();
    expect(screen.getByText(/Tampoco/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    const json = {
      name: "copia.json",
      size: 80,
      type: "application/json",
      text: async () => JSON.stringify({
        schemaVersion: 3,
        title: "Documento JSON",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Contenido JSON." }] }],
        },
      }),
    } as unknown as File;
    fireEvent.change(document.getElementById("aula-documentos-import-file") as HTMLInputElement, {
      target: { files: [json] },
    });

    expect(await screen.findByRole("heading", { name: "Documento JSON" })).toBeTruthy();
    expect(screen.getByText("Contenido JSON.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    const html = {
      name: "pagina.html",
      size: 20,
      type: "text/html",
      text: async () => "<h1>Hola</h1>",
    } as unknown as File;
    fireEvent.drop(screen.getByText("Arrastra un archivo aquí").closest("label") as HTMLElement, {
      dataTransfer: { files: [html] },
    });

    expect(await screen.findByText(/HTML, ODT, RTF y PDF no se admiten/)).toBeTruthy();
  });

  it("muestra el origen y bloquea reimportar el mismo contenido", async () => {
    const file = {
      name: "clase.md",
      size: 20,
      type: "text/markdown",
      text: async () => "# Clase\n\nTexto de clase.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    importDocument();
    fireEvent.change(document.getElementById("aula-documentos-import-file") as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(await screen.findByRole("heading", { name: "Clase" })).toBeTruthy();
    expect(screen.getByText(/clase\.md/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que se reemplaza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Clase"));
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("clase.md"))).toBe(true);

    importDocument();
    fireEvent.change(document.getElementById("aula-documentos-import-file") as HTMLInputElement, {
      target: { files: [file] },
    });
    expect(await screen.findByText("Ya abierto.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que se reemplaza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));
    expect(screen.getByRole("dialog", { name: "Importar documento" })).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Clase");
  });

  it("cancelar la importación no cambia el documento", async () => {
    const file = {
      name: "cancelar.md",
      size: 20,
      type: "text/markdown",
      text: async () => "# No aplicar\n\nTexto.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    importDocument();
    fireEvent.change(document.getElementById("aula-documentos-import-file") as HTMLInputElement, {
      target: { files: [file] },
    });
    expect(await screen.findByRole("heading", { name: "No aplicar" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
    expect(screen.queryByRole("dialog", { name: "Importar documento" })).toBeNull();
  });

  it("importa un DOCX/PPTX con vista previa", async () => {
    officeImportMock.importOfficeFile.mockResolvedValueOnce({
      ok: true,
      preview: {
        source: "office",
        document: savedDocument("Informe Office"),
        stats: { nodes: 2, depth: 2, textLength: 18, mermaidBlocks: 0, slideBreaks: 0, images: 0 },
        warnings: ["La maquetación visual puede cambiar."],
      },
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Archivo" })).toBeTruthy());
    importDocument();
    const input = document.getElementById("aula-documentos-import-file") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["docx"], "informe.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });

    await waitFor(() => expect(officeImportMock.importOfficeFile).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Informe Office" })).toBeTruthy();
    expect(screen.getByText(/Documento de Office/)).toBeTruthy();
    expect(screen.getByText("La maquetación visual puede cambiar.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver original" })).toBeTruthy();
  });

  it("migra las apps antiguas y ofrece deshacer", async () => {
    const migrated = savedDocument("Documentos migrados");
    const status = {
      aula: { exists: false, updatedAt: null },
      sources: [
        { source: "documentos", exists: false, updatedAt: null, valid: false },
        { source: "mermaid", exists: true, updatedAt: 4, valid: true },
        { source: "presentaciones", exists: false, updatedAt: null, valid: false },
      ],
      migration: { active: false, createdAt: null },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(status), { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        action: "migrate",
        status: "migrated",
        document: migrated,
        updatedAt: 15,
        sources: ["mermaid"],
        warnings: [],
      }), { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ...status,
        aula: { exists: true, updatedAt: 15 },
        migration: { active: true, createdAt: 15 },
      }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    chooseMenu("Importar", "Migrar apps antiguas");

    expect(await screen.findByRole("dialog", { name: "Migrar apps antiguas" })).toBeTruthy();
    expect(await screen.findByText("Diagramas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Migrar datos" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documentos migrados"));
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("Migración aplicada"))).toBe(true);
    expect(await screen.findByRole("button", { name: "Deshacer migración" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/aula-documentos/migration?project=p1", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/aula-documentos/migration?project=p1",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "migrate" }) }),
    );

    vi.unstubAllGlobals();
  });

});
