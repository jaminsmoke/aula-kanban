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

describe("Recuperación y plantillas de Aula Documentos", () => {
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
    fireEvent.click(await screen.findByRole("button", { name: "Copias locales (1)" }));

    expect(await screen.findByRole("dialog", { name: "Copias locales" })).toBeTruthy();
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
    await screen.findByRole("dialog", { name: "Nuevo documento" });
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

});
