import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { buildAulaDocumentCopy } from "../../../../lib/domain/aula-documentos/copy";
import { listAulaRecoveryCopies, saveAulaRecoveryCopy } from "../../../../lib/domain/aula-documentos/recovery";
import { useWindowAttemptClose, WindowCloseProvider } from "../../shared/window-close-guard";
import type { VersionedSaveResult } from "../use-app-document";
import AulaDocumentosApp, { AUTOSAVE_DELAY_MS } from "./aula-documentos-app";

// jsdom no implementa las medidas de rango que ProseMirror usa al cambiar la selección.
if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}
if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
}
if (typeof Element !== "undefined" && !Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
}
if (typeof Node !== "undefined") {
  const nodePrototype = Node.prototype as unknown as {
    getClientRects?: () => DOMRectList;
    getBoundingClientRect?: () => DOMRect;
  };
  nodePrototype.getClientRects ??= () => [] as unknown as DOMRectList;
  nodePrototype.getBoundingClientRect ??= () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
}

const officeImportMock = vi.hoisted(() => ({
  importOfficeFile: vi.fn(),
}));

vi.mock("../../shared/office/office-import", () => officeImportMock);

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
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null; ok?: boolean }> => ({ state: null, updatedAt: null, ok: true })),
  save: vi.fn(async (_state: unknown, _expectedUpdatedAt?: number | null) => true),
  saveVersioned: vi.fn(async (state: unknown, expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => {
    const ok = await documentMock.save(state, expectedUpdatedAt);
    return ok ? { status: "saved" as const, updatedAt: Date.now() } : { status: "failed" as const };
  }),
  notesLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  mermaidLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  presentationsLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
}));

const mermaidMock = vi.hoisted(() => ({
  render: vi.fn(async (code: string) => `<svg data-mermaid-preview="true"><text>${code}</text></svg>`),
}));

const printMock = vi.hoisted(() => vi.fn());

vi.mock("../../shared/aula-documentos/print-html", () => ({
  printHtmlDocument: printMock,
}));

const copyMock = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../shared/aula-documentos/copy-client", () => ({
  listAulaCopies: copyMock.list,
  saveAulaCopy: copyMock.save,
  downloadAulaCopy: copyMock.download,
  deleteAulaCopy: copyMock.remove,
  aulaCopySizeLabel: () => "4.0 KB",
  aulaCopyDateLabel: () => "20 nov 2026",
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
    saveVersioned: documentMock.saveVersioned,
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
 * Abre un menú de la barra de Aula Documentos.
 * @param name - Etiqueta del menú.
 */
function openMenu(name: "Archivo" | "Importar" | "Formato" | "Insertar" | "Exportar") {
  fireEvent.click(screen.getByRole("button", { name }));
}

/**
 * Elige una acción de un menú.
 * @param menu - Menú que se abre.
 * @param item - Acción que se pulsa.
 */
function chooseMenu(menu: "Archivo" | "Importar" | "Formato" | "Insertar" | "Exportar", item: string) {
  openMenu(menu);
  fireEvent.click(screen.getByRole("menuitem", { name: item }));
}

function newDocument() {
  chooseMenu("Archivo", "Nuevo documento");
}

function openCopies() {
  chooseMenu("Archivo", "Copias portables");
}

function importDocument() {
  chooseMenu("Importar", "Importar documento");
}

function insertMermaid() {
  chooseMenu("Insertar", "Insertar diagrama Mermaid");
}

function insertSlideBreak() {
  chooseMenu("Insertar", "Insertar salto de diapositiva");
}

function printPdf() {
  chooseMenu("Exportar", "Imprimir o guardar PDF");
}

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

/**
 * Construye un documento válido para simular otra versión del servidor.
 * @param title - Título del documento.
 * @returns Documento listo para guardar o cargar.
 */
function savedDocument(title: string): AulaDocument {
  return {
    schemaVersion: 3,
    title,
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Contenido de prueba." }],
      }],
    },
  } as AulaDocument;
}

/**
 * Sustituye la descarga del navegador para poder comprobar la copia.
 * @returns El espía de `URL.createObjectURL`.
 */
function stubDownload() {
  const createObjectURL = vi.fn(() => "blob:copia");
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return createObjectURL;
}

describe("Documentos, importación y cierre de Aula Documentos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    documentMock.loading = false;
    documentMock.load.mockReset();
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null, ok: true });
    documentMock.save.mockReset();
    documentMock.save.mockResolvedValue(true);
    documentMock.saveVersioned.mockReset();
    documentMock.saveVersioned.mockImplementation(async (state: unknown, expectedUpdatedAt: number | null) => {
      const ok = await documentMock.save(state, expectedUpdatedAt);
      return ok ? { status: "saved" as const, updatedAt: Date.now() } : { status: "failed" as const };
    });
    documentMock.notesLoad.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.mermaidLoad.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.presentationsLoad.mockResolvedValue({ state: null, updatedAt: null });
    mermaidMock.render.mockImplementation(async (code: string) => `<svg data-mermaid-preview="true"><text>${code}</text></svg>`);
    copyMock.list.mockReset();
    copyMock.list.mockResolvedValue({ ok: true, copies: [] });
    copyMock.save.mockReset();
    copyMock.download.mockReset();
    copyMock.remove.mockReset();
    window.localStorage.clear();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

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
    const input = document.getElementById("aula-documentos-office-file") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["docx"], "informe.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });

    await waitFor(() => expect(officeImportMock.importOfficeFile).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("heading", { name: "Informe Office" })).toBeTruthy();
    expect(screen.getByText("Documento de Office")).toBeTruthy();
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
