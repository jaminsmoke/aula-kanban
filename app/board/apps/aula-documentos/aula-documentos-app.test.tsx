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

describe("Aula Documentos", () => {
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

  it("restaura una copia local con confirmación sin guardarla en el servidor", async () => {
    const createObjectURL = stubDownload();
    saveAulaRecoveryCopy(window.localStorage, "p1", {
      document: savedDocument("Copia recuperada"),
      reason: "replace",
      serverUpdatedAt: 8,
      now: 1_000,
      id: "copia-local",
    });
    documentMock.load.mockResolvedValueOnce({
      state: savedDocument("Documento actual"),
      updatedAt: 12,
      ok: true,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento actual"));
    fireEvent.click(screen.getByRole("button", { name: "Copias locales (1)" }));

    expect(screen.getByRole("dialog", { name: "Copias locales" })).toBeTruthy();
    expect(screen.getByText("Copia recuperada")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copia descargada.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(screen.getByText(/no se guardará en el servidor hasta que pulses/)).toBeTruthy();
    expect(documentMock.saveVersioned).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar restauración" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Copias locales" })).toBeNull());
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Copia recuperada");
    expect(screen.getByRole("status").textContent).toContain("Todavía no se ha guardado");
    expect(documentMock.saveVersioned).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    expect(documentMock.saveVersioned.mock.calls[0][1]).toBe(12);
  });

  it("guarda una copia local antes de reemplazar con una plantilla", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: savedDocument("Documento actual"),
      updatedAt: 5,
      ok: true,
    });

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento actual"));
    newDocument();
    fireEvent.click(screen.getByRole("button", { name: /Documento vacío/ }));
    fireEvent.click(screen.getByRole("button", { name: "Crear documento" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento sin título"));
    expect(listAulaRecoveryCopies(window.localStorage, "p1")[0]).toMatchObject({
      title: "Documento actual",
      reason: "replace",
      serverUpdatedAt: 5,
    });
    expect(screen.getByRole("button", { name: "Copias locales (1)" })).toBeTruthy();
  });

  it("no guarda mientras el documento se está cargando", async () => {
    documentMock.loading = true;
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    vi.useFakeTimers();
    insertMermaid();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + 100);
    });
    vi.useRealTimers();

    expect(documentMock.save).not.toHaveBeenCalled();
  });

  it("guarda un borrador Mermaid sin pulsar Aplicar", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    insertMermaid();
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const nextCode = "flowchart TD\nX --> Y";
    fireEvent.change(screen.getByLabelText("Código Mermaid"), { target: { value: nextCode } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    const block = saved.content.content?.find((node) => node.type === "mermaidBlock");
    expect(block?.attrs?.code).toBe(nextCode);
  });

  it("edita el contenido de un Gantt dentro del bloque Mermaid", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    insertMermaid();
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    fireEvent.change(screen.getByLabelText("Código Mermaid"), {
      target: {
        value: "gantt\n  title Plan de proyecto\n  dateFormat YYYY-MM-DD\n  section Trabajo\n  Tarea :t1, 2026-01-01, 2d",
      },
    });
    const guided = await screen.findByRole("button", { name: "Contenido" });
    await waitFor(() => expect(guided).toHaveProperty("disabled", false));
    fireEvent.click(guided);

    expect(screen.getByLabelText("Título del Gantt")).toHaveProperty("value", "Plan de proyecto");
    fireEvent.change(screen.getByLabelText("Título del Gantt"), { target: { value: "Plan editado" } });
    fireEvent.click(screen.getByRole("button", { name: "Código" }));

    expect((screen.getByLabelText("Código Mermaid") as HTMLTextAreaElement).value).toContain("title Plan editado");
    expect(screen.getByRole("button", { name: "Exportar diagrama SVG" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Ver diagrama en pantalla completa" })).toBeTruthy();
  });

  it("autoguarda el borrador Mermaid sin cerrar el editor", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    insertMermaid();
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
    insertMermaid();
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
    insertMermaid();
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
    insertMermaid();
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

  it("edita la presentación desde la fuente Markdown", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Fuente Markdown" }));
    const source = screen.getByLabelText("Fuente Markdown de la presentación") as HTMLTextAreaElement;
    expect(source.value).toContain("# ");

    fireEvent.change(source, {
      target: {
        value: "# Nueva presentación\n\nPrimera diapositiva.\n\n---\n\n## Segunda\n\nContenido final.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar fuente" }));

    await waitFor(() => expect((screen.getByLabelText("Título del documento") as HTMLInputElement).value).toBe("Nueva presentación"));
    expect(screen.getByText("2 diapositivas")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Fuente Markdown aplicada");
  });

  it("abre un archivo local en el visor Office", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const input = screen.getByLabelText("Elegir archivo de Office para el visor") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["docx"], "informe.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });

    expect(await screen.findByRole("heading", { name: "Visor Office" })).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("crea un documento vacío desde el selector de plantillas", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    newDocument();
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

    newDocument();
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

    newDocument();
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
    insertMermaid();
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
    insertMermaid();
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
    insertMermaid();
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
    insertMermaid();
    await screen.findByRole("button", { name: "Editar" });
    fireEvent.click(screen.getByRole("button", { name: "Copiar código Mermaid" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("flowchart TD");
  });

  it("permite ampliar y restablecer el zoom del diagrama", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    insertMermaid();
    await waitFor(() => expect(document.querySelector(".aula-mermaid-svg")).toBeTruthy());

    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Acercar diagrama" }));
    expect(screen.getByText("125%")).toBeTruthy();
    expect(document.querySelector(".aula-mermaid-zoom")?.getAttribute("data-zoom")).toBe("1.25");
    expect(document.querySelector(".aula-mermaid-preview")?.getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("group", { name: "Controles de zoom del diagrama" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Diagrama Mermaid" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Restablecer zoom" }));
    expect(screen.getByText("100%")).toBeTruthy();
    expect(document.querySelector(".aula-mermaid-zoom")?.getAttribute("data-zoom")).toBe("1");
  });

  it("prepara una impresión autónoma sin la interfaz del editor", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    printPdf();

    await waitFor(() => expect(printMock).toHaveBeenCalledTimes(1));
    const html = printMock.mock.calls[0][0] as string;
    expect(html).toContain("<title>Documento de ejemplo</title>");
    expect(html).toContain("@media print");
    expect(html).toContain("break-inside: avoid");
    expect(html).not.toContain("aula-documentos-toolbar");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("guarda el tema de presentación con el documento", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Tema de la presentación"), { target: { value: "claro" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.schemaVersion).toBe(3);
    expect(saved.presentation).toEqual({ theme: "claro" });
  });

  it("muestra una vista previa navegable con el recuento de diapositivas", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    expect(screen.getByText("2 diapositivas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" })).toBeTruthy();
    expect(screen.getByText("Diapositiva 1 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Diapositiva 2 de 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Siguiente" })).toHaveProperty("disabled", true);
  });

  it("guarda las notas del orador con la diapositiva", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" });
    fireEvent.change(screen.getByLabelText(/Notas del orador/), {
      target: { value: "Recordar explicar el ejemplo." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar vista previa" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.presentation?.notes?.["0"]).toBe("Recordar explicar el ejemplo.");
  });

  it("ofrece acciones etiquetadas en el menú móvil", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Acciones del documento" }));
    expect(screen.getByRole("menu", { name: "Acciones del documento" })).toBeTruthy();
    for (const name of ["Nuevo documento", "Importar documento", "Guardar documento", "Insertar diagrama Mermaid", "Insertar salto de diapositiva", "Presentar documento", "Exportar HTML", "Exportar DOCX", "Exportar PPTX", "Exportar presentación"]) {
      expect(screen.getByRole("menuitem", { name })).toBeTruthy();
    }

    const actionsButton = screen.getByRole("button", { name: "Acciones del documento" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Acciones del documento" })).toBeNull();
    expect(document.activeElement).toBe(actionsButton);

    fireEvent.click(actionsButton);
    fireEvent.click(screen.getByRole("menuitem", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("menu", { name: "Acciones del documento" })).toBeNull();
  });

  it("ofrece un menú de formato etiquetado en móvil", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Formato del documento" }));
    expect(screen.getByRole("menu", { name: "Formato del documento" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Deshacer" })).toBeTruthy();
    for (const name of ["Negrita", /Título 1/, "Lista con viñetas", "Cita", "Bloque de código"]) {
      expect(screen.getByRole("menuitemcheckbox", { name })).toBeTruthy();
    }

    fireEvent.keyDown(screen.getByRole("menu", { name: "Formato del documento" }), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Formato del documento" })).toBeNull();
  });

  it("atrapa el foco en los diálogos y lo devuelve al control de origen", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    const trigger = screen.getByRole("button", { name: "Acciones del documento" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Nuevo documento" }));
    const dialog = await screen.findByRole("dialog", { name: "Nuevo documento" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const close = screen.getByRole("button", { name: "Cerrar nuevo documento" });
    expect(document.activeElement).toBe(close);
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    cancel.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nuevo documento" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
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

  it("abre copias portables y guarda una copia en el proyecto", async () => {
    copyMock.list.mockResolvedValue({ ok: true, copies: [] });
    copyMock.save.mockResolvedValue({
      ok: true,
      copy: {
        id: "copy1",
        title: "Documento de ejemplo",
        format: "aula-document-copy",
        formatVersion: 1,
        schemaVersion: 3,
        sizeBytes: 1234,
        author: "Tú",
        createdAt: 100,
        downloadUrl: "/api/aula-documentos/copies/copy1",
      },
    });
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openCopies();
    expect(await screen.findByRole("dialog", { name: "Copias portables" })).toBeTruthy();
    await waitFor(() => expect(copyMock.list).toHaveBeenCalledWith("p1"));

    fireEvent.click(screen.getByRole("button", { name: "Guardar en el proyecto" }));
    await waitFor(() => expect(copyMock.save).toHaveBeenCalledTimes(1));
    expect(copyMock.save).toHaveBeenCalledWith("p1", expect.any(Uint8Array), "documento-de-ejemplo.aula.zip");
    expect(await screen.findByText("Copia guardada en el proyecto.")).toBeTruthy();
  });

  it("mantiene la descarga local aunque falle el listado de R2", async () => {
    const createObjectURL = stubDownload();
    copyMock.list.mockResolvedValue({ ok: false, message: "R2 no disponible." });
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openCopies();
    await waitFor(() => expect(screen.getByText("R2 no disponible.")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Descargar copia local" }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Copia local descargada.")).toBeTruthy();
  });

  it("lista, descarga y borra copias guardadas", async () => {
    const createObjectURL = stubDownload();
    const copy = {
      id: "copy1",
      title: "Copia de clase",
      format: "aula-document-copy",
      formatVersion: 1,
      schemaVersion: 3,
      sizeBytes: 4096,
      author: "Otro miembro",
      createdAt: 100,
      downloadUrl: "/api/aula-documentos/copies/copy1",
    };
    copyMock.list.mockResolvedValue({ ok: true, copies: [copy] });
    copyMock.download.mockResolvedValue({ ok: true, blob: new Blob(["zip"], { type: "application/zip" }) });
    copyMock.remove.mockResolvedValue({ ok: true });
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openCopies();
    expect(await screen.findByText("Copia de clase")).toBeTruthy();
    expect(screen.getByText(/4\.0 KB · Otro miembro/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
    await waitFor(() => expect(copyMock.download).toHaveBeenCalledWith(expect.objectContaining(copy)));
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar borrado" }));
    await waitFor(() => expect(copyMock.remove).toHaveBeenCalledWith(expect.objectContaining(copy)));
    await waitFor(() => expect(screen.queryByText("Copia de clase")).toBeNull());
  });

  it("no ofrece guardar ni borrar copias a invitados", async () => {
    copyMock.list.mockResolvedValue({
      ok: true,
      copies: [{
        id: "copy1",
        title: "Copia de clase",
        format: "aula-document-copy",
        formatVersion: 1,
        schemaVersion: 3,
        sizeBytes: 4096,
        author: "Otro miembro",
        createdAt: 100,
        downloadUrl: "/api/aula-documentos/copies/copy1",
      }],
    });
    render(<AulaDocumentosApp {...props} role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openCopies();
    expect(await screen.findByText("Copia de clase")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guardar en el proyecto" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Borrar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Descargar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Descargar copia local" })).toBeTruthy();
  });

  it("previsualiza e importa una copia portable con confirmación", async () => {
    const built = await buildAulaDocumentCopy({
      schemaVersion: 3,
      title: "Copia importada",
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Contenido restaurado." }],
        }],
      },
    }, [], { createdAt: "2026-11-20T10:00:00.000Z" });
    if (!built.ok) throw new Error(built.message);

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Elegir copia portable para importar"), {
      target: { files: [new File([built.bytes.slice().buffer as ArrayBuffer], "copia.aula.zip", { type: "application/zip" })] },
    });

    expect(await screen.findByRole("dialog", { name: "Importar copia portable" })).toBeTruthy();
    expect(screen.getByText("Copia importada")).toBeTruthy();
    expect(screen.getByText("Contenido restaurado.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    await waitFor(() => expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Copia importada"));
    expect(screen.queryByRole("dialog", { name: "Importar copia portable" })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Copia portable importada");
  });

  it("importa una copia con imágenes y vuelve a subir sus recursos", async () => {
    const oldId = "00000000-0000-4000-8000-000000000001";
    const newId = "11111111-1111-4111-8111-111111111111";
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nTQAAAAASUVORK5CYII="),
      (char) => char.charCodeAt(0),
    );
    const built = await buildAulaDocumentCopy({
      schemaVersion: 3,
      title: "Copia con imagen",
      content: {
        type: "doc",
        content: [{
          type: "aulaImage",
          attrs: { src: `/api/files/${oldId}`, alt: "Foto", caption: "Pie", width: 80, alignment: "center" },
        }],
      },
    }, [{ id: oldId, mime: "image/png", bytes: png }], { createdAt: "2026-11-20T10:00:00.000Z" });
    if (!built.ok) throw new Error(built.message);

    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (String(input).includes("/api/uploads")) {
        return new Response(JSON.stringify({ url: `/api/files/${newId}` }), { status: 201 });
      }
      return new Response("{}", { status: 200 });
    }));

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Elegir copia portable para importar"), {
      target: { files: [new File([built.bytes.slice().buffer as ArrayBuffer], "copia-con-imagen.aula.zip", { type: "application/zip" })] },
    });

    expect(await screen.findByRole("dialog", { name: "Importar copia portable" })).toBeTruthy();
    expect(screen.getAllByText(/1 imagen/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    await waitFor(() => {
      expect(document.querySelector(".aula-image-block img")?.getAttribute("src")).toBe(`/api/files/${newId}`);
    });
    expect(document.querySelector(".aula-image-block img")?.getAttribute("alt")).toBe("Foto");
    expect(document.querySelector(".aula-image-block figcaption")?.textContent).toBe("Pie");
    expect(screen.getByRole("status").textContent).toContain("Copia portable importada");
  });

  it("no cambia el documento si falla la subida de una imagen de la copia", async () => {
    const oldId = "00000000-0000-4000-8000-000000000001";
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nTQAAAAASUVORK5CYII="),
      (char) => char.charCodeAt(0),
    );
    const built = await buildAulaDocumentCopy({
      schemaVersion: 3,
      title: "Copia con imagen",
      content: {
        type: "doc",
        content: [{
          type: "aulaImage",
          attrs: { src: `/api/files/${oldId}`, alt: "Foto", caption: "", width: 80, alignment: "center" },
        }],
      },
    }, [{ id: oldId, mime: "image/png", bytes: png }], { createdAt: "2026-11-20T10:00:00.000Z" });
    if (!built.ok) throw new Error(built.message);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ message: "La cuota de imágenes del proyecto está llena." }),
      { status: 413 },
    )));

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Elegir copia portable para importar"), {
      target: { files: [new File([built.bytes.slice().buffer as ArrayBuffer], "copia-con-imagen.aula.zip", { type: "application/zip" })] },
    });
    await screen.findByRole("dialog", { name: "Importar copia portable" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Importar y reemplazar" }));

    expect(await screen.findByText("La cuota de imágenes del proyecto está llena.")).toBeTruthy();
    expect(screen.getByLabelText("Título del documento")).toHaveProperty("value", "Documento de ejemplo");
    expect(screen.getByRole("dialog", { name: "Importar copia portable" })).toBeTruthy();
  });

  it("muestra el aviso de cuota llena al guardar una copia", async () => {
    copyMock.list.mockResolvedValue({ ok: true, copies: [] });
    copyMock.save.mockResolvedValue({ ok: false, message: "La cuota de copias del proyecto está llena." });
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    openCopies();
    await waitFor(() => expect(copyMock.list).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Guardar en el proyecto" }));
    expect(await screen.findByText("La cuota de copias del proyecto está llena.")).toBeTruthy();
  });

  it("inserta una imagen local desde el selector del documento", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (String(input).includes("/api/uploads")) {
        return new Response(JSON.stringify({ url: "/api/files/00000000-0000-4000-8000-000000000001" }), { status: 201 });
      }
      if (String(input).includes("/api/files/00000000-0000-4000-8000-000000000001")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    }));

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Elegir imagen para el documento"), {
      target: { files: [new File(["png"], "foto.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(document.querySelector(".aula-image-block img")?.getAttribute("src")).toBe("/api/files/00000000-0000-4000-8000-000000000001");
    });
    const img = document.querySelector(".aula-image-block img");
    expect(img?.getAttribute("alt")).toBe("foto");
    expect(screen.getByRole("status").textContent).toContain("Imagen insertada");

    const createObjectURL = stubDownload();
    openMenu("Exportar");
    fireEvent.click(screen.getByRole("menuitem", { name: "Exportar HTML" }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    const exported = ((createObjectURL.mock.calls as unknown) as [[Blob]])[0][0];
    await expect(exported.text()).resolves.toContain("data:image/png;base64,");
    await expect(exported.text()).resolves.not.toContain("/api/files/00000000-0000-4000-8000-000000000001");
  });

  it("inserta una tabla y edita su estructura desde la barra contextual", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    await waitFor(() => expect(document.querySelector("[data-aula-table-ready]")).toBeTruthy());

    chooseMenu("Insertar", "Insertar tabla");
    expect(await screen.findByRole("dialog", { name: "Insertar tabla" })).toBeTruthy();
    fireEvent.click(screen.getByRole("gridcell", { name: "Crear tabla de 3 filas y 2 columnas" }));

    await waitFor(() => expect(document.querySelectorAll(".aula-documentos-prose table tr")).toHaveLength(3));
    expect(document.querySelectorAll(".aula-documentos-prose table th")).toHaveLength(2);
    expect(await screen.findByRole("toolbar", { name: "Herramientas de tabla" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Añadir fila abajo" }));
    await waitFor(() => expect(document.querySelectorAll(".aula-documentos-prose table tr")).toHaveLength(4));

    fireEvent.click(screen.getByRole("button", { name: "Añadir columna a la derecha" }));
    await waitFor(() => expect(document.querySelectorAll(".aula-documentos-prose table th")).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Eliminar tabla" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar borrado" }));
    await waitFor(() => expect(document.querySelector(".aula-documentos-prose table")).toBeNull());
  });

  it("no ofrece insertar tablas a invitados", async () => {
    render(<AulaDocumentosApp {...props} role="guest" />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Insertar" })).toHaveProperty("disabled", true);
  });

  it("inserta un salto de diapositiva y lo guarda", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    insertSlideBreak();
    expect(await screen.findByText("Salto de diapositiva")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.content.content?.some((node) => node.type === "slideBreak")).toBe(true);
  });

  it("importa un Markdown con vista previa", async () => {
    const file = {
      name: "clase.md",
      size: 24,
      text: async () => "# Clase\n\nTexto desde Markdown.",
    } as unknown as File;

    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());
    importDocument();
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
    openMenu("Archivo");
    expect(screen.getByRole("menuitem", { name: "Nuevo documento" })).toHaveProperty("disabled", true);
    fireEvent.keyDown(screen.getByRole("menu", { name: "Archivo" }), { key: "Escape" });
    openMenu("Importar");
    expect(screen.getByRole("menuitem", { name: "Importar documento" })).toHaveProperty("disabled", true);
    fireEvent.keyDown(screen.getByRole("menu", { name: "Importar" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Guardar documento" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Formato" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Insertar" })).toHaveProperty("disabled", true);
    openMenu("Exportar");
    expect(screen.getByRole("menuitem", { name: "Exportar HTML" })).toHaveProperty("disabled", false);
    fireEvent.keyDown(screen.getByRole("menu", { name: "Exportar" }), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Negrita" })).toBeNull();
    expect(screen.getByLabelText("Contenido del documento").getAttribute("contenteditable")).toBe("false");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(documentMock.save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    await screen.findByRole("dialog", { name: "Vista previa: Documento de ejemplo" });
    expect(screen.getByLabelText(/Notas del orador/)).toHaveProperty("readOnly", true);
  });
});
