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

describe("Copias, imágenes y tablas de Aula Documentos", () => {
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

