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

describe("Autosave y conflictos de Aula Documentos", () => {
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

  it("monta el título, el editor y las acciones principales", async () => {
    render(<AulaDocumentosApp {...props} />);

    expect(screen.queryByText("Suite documental")).toBeNull();
    expect(document.querySelector(".aula-documentos-heading")).toBeNull();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
    expect(screen.getByRole("toolbar", { name: "Menus del documento" })).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: "Herramientas del documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negrita" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archivo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Formato" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insertar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Presentar documento" })).toBeTruthy();

    openMenu("Insertar");
    expect(screen.getByRole("menuitem", { name: "Insertar diagrama Mermaid" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu", { name: "Insertar" }), { key: "Escape" });
    openMenu("Exportar");
    expect(screen.getByRole("menuitem", { name: "Exportar HTML" })).toBeTruthy();

    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Documento de ejemplo listo");
    expect(screen.getByText("0 diagramas")).toBeTruthy();
  });

  it("agrupa las acciones por intención sin duplicar la barra directa", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openMenu("Archivo");
    expect(screen.getByRole("menuitem", { name: "Nuevo documento" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Importar documento" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Guardar documento" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("menu", { name: "Archivo" }), { key: "Escape" });

    openMenu("Importar");
    for (const name of ["Importar documento", "Abrir Office", "Migrar apps antiguas"]) {
      expect(screen.getByRole("menuitem", { name })).toBeTruthy();
    }
    fireEvent.keyDown(screen.getByRole("menu", { name: "Importar" }), { key: "Escape" });

    openMenu("Formato");
    expect(screen.getByRole("menuitemcheckbox", { name: /Título 1/ })).toBeTruthy();
    expect(screen.queryByRole("menuitemcheckbox", { name: "Negrita" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("menu", { name: "Formato" }), { key: "Escape" });

    openMenu("Insertar");
    expect(screen.getByRole("menuitem", { name: "Insertar diagrama Mermaid" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Insertar salto de diapositiva" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu", { name: "Insertar" }), { key: "Escape" });

    openMenu("Exportar");
    for (const name of ["Exportar HTML", "Imprimir o guardar PDF", "Exportar Markdown", "Exportar DOCX", "Exportar PPTX", "Exportar presentación"]) {
      expect(screen.getByRole("menuitem", { name })).toBeTruthy();
    }
    fireEvent.keyDown(screen.getByRole("menu", { name: "Exportar" }), { key: "Escape" });

    expect(screen.getByRole("button", { name: "Guardar documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Presentar documento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negrita" })).toBeTruthy();
  });

  it("crea listas de tareas y conserva el formato al guardar", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openMenu("Formato");
    expect(screen.getByRole("menuitemcheckbox", { name: "Lista de tareas" })).toBeTruthy();
    expect(screen.getByRole("menuitemcheckbox", { name: "Tachado" })).toBeTruthy();
    expect(screen.getByRole("menuitemcheckbox", { name: "Centrar" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Línea horizontal" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Limpiar formato" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Lista de tareas" }));

    await waitFor(() => expect(document.querySelector('.aula-documentos-prose ul[data-type="taskList"]')).toBeTruthy());
    openMenu("Formato");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Centrar" }));
    await waitFor(() => expect(document.querySelector<HTMLElement>('.aula-documentos-prose p')?.style.textAlign).toBe("center"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(JSON.stringify(saved.content)).toContain('"taskList"');
    expect(JSON.stringify(saved.content)).toContain('"textAlign":"center"');
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
    insertMermaid();
    insertMermaid();
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

    insertMermaid();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toContain("guardado en el proyecto");
  });

  it("mantiene el documento sucio y permite reintentar si falla el guardado", async () => {
    documentMock.save.mockResolvedValueOnce(false);
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    insertMermaid();
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

  it("detiene el autosave y el guardado manual al abrir un conflicto", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: savedDocument("Versión inicial"),
      updatedAt: 5,
      ok: true,
    });
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 12 });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión inicial"));
    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambio local" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    expect(await screen.findByRole("dialog", { name: "Conflicto de versión" })).toBeTruthy();
    expect(screen.getByText("Conflicto sin resolver")).toBeTruthy();
    expect(screen.getByText(/Versión del servidor:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar documento" })).toHaveProperty("disabled", true);
    expect(documentMock.saveVersioned).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cambio local" }),
      5,
    );

    const calls = documentMock.saveVersioned.mock.calls.length;
    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    expect(documentMock.saveVersioned).toHaveBeenCalledTimes(calls);
  });

  it("recarga la versión del servidor y guarda después con la versión nueva", async () => {
    documentMock.load
      .mockResolvedValueOnce({
        state: savedDocument("Versión local"),
        updatedAt: 5,
        ok: true,
      })
      .mockResolvedValueOnce({
        state: savedDocument("Versión del servidor"),
        updatedAt: 30,
        ok: true,
      });
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 30 });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión local"));
    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambio local" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await screen.findByRole("dialog", { name: "Conflicto de versión" });

    fireEvent.click(screen.getByRole("button", { name: "Recargar versión del servidor" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Conflicto de versión" })).toBeNull());
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión del servidor");
    expect(documentMock.load).toHaveBeenCalledTimes(2);
    expect(listAulaRecoveryCopies(window.localStorage, "p1")[0]).toMatchObject({
      title: "Cambio local",
      reason: "conflict",
      serverUpdatedAt: 30,
    });
    expect(screen.getByRole("status").textContent).toContain("Versión del servidor recargada");

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Después de recargar" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(2));
    expect(documentMock.saveVersioned.mock.calls[1][1]).toBe(30);
  });

  it("descarga una copia y conserva la versión local solo tras confirmar", async () => {
    const createObjectURL = stubDownload();
    documentMock.load.mockResolvedValueOnce({
      state: savedDocument("Versión local"),
      updatedAt: 5,
      ok: true,
    });
    documentMock.saveVersioned
      .mockResolvedValueOnce({ status: "conflict", updatedAt: 12 })
      .mockResolvedValueOnce({ status: "saved", updatedAt: 20 });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Versión local"));
    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Cambio local" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await screen.findByRole("dialog", { name: "Conflicto de versión" });

    fireEvent.click(screen.getByRole("button", { name: "Descargar copia" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copia de tu versión descargada.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Conservar la mía" }));
    expect(screen.getByText(/Se descargará una copia JSON/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descargar copia y sobrescribir" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Conflicto de versión" })).toBeNull());
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(documentMock.saveVersioned).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Cambio local" }),
      12,
    );
    expect(listAulaRecoveryCopies(window.localStorage, "p1")[0]).toMatchObject({
      title: "Cambio local",
      reason: "conflict",
      serverUpdatedAt: 12,
    });
    expect(screen.getByRole("button", { name: "Copias locales (1)" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Tu versión se guardó");

    fireEvent.change(screen.getByLabelText("Título del documento"), { target: { value: "Después de conservar" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(3));
    expect(documentMock.saveVersioned.mock.calls[2][1]).toBe(20);
  });

});
