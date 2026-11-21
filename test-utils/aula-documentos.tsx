import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { AulaDocument } from "../lib/domain/aula-documentos/document";
import { useWindowAttemptClose } from "../app/board/shared/window-close-guard";
import type { VersionedSaveResult } from "../app/board/apps/use-app-document";

const officeImportMock = vi.hoisted(() => ({
  importOfficeFile: vi.fn(),
}));

vi.mock("../app/board/shared/office/office-import", () => officeImportMock);

const documentMock = vi.hoisted(() => ({
  loading: false as boolean,
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null; ok?: boolean }> => ({
    state: null,
    updatedAt: null,
    ok: true,
  })),
  save: vi.fn(async (_state: unknown, _expectedUpdatedAt?: number | null) => true),
  saveVersioned: vi.fn(async (state: unknown, expectedUpdatedAt: number | null): Promise<VersionedSaveResult> => {
    const ok = await documentMock.save(state, expectedUpdatedAt);
    return ok ? { status: "saved" as const, updatedAt: Date.now() } : { status: "failed" as const };
  }),
  notesLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({
    state: null,
    updatedAt: null,
  })),
  mermaidLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({
    state: null,
    updatedAt: null,
  })),
  presentationsLoad: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({
    state: null,
    updatedAt: null,
  })),
}));

const mermaidMock = vi.hoisted(() => ({
  render: vi.fn(async (code: string) => `<svg data-mermaid-preview="true"><text>${code}</text></svg>`),
}));

const printMock = vi.hoisted(() => vi.fn());

vi.mock("../app/board/shared/aula-documentos/print-html", () => ({
  printHtmlDocument: printMock,
}));

const copyMock = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../app/board/shared/aula-documentos/copy-client", () => ({
  listAulaCopies: copyMock.list,
  saveAulaCopy: copyMock.save,
  downloadAulaCopy: copyMock.download,
  deleteAulaCopy: copyMock.remove,
  aulaCopySizeLabel: () => "4.0 KB",
  aulaCopyDateLabel: () => "20 nov 2026",
}));

vi.mock("../app/board/apps/use-app-document", () => ({
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

vi.mock("../app/board/apps/aula-documentos/editor/diagramas/mermaid-renderer", () => ({
  getMermaidRenderer: () => mermaidMock,
  createMermaidRenderer: () => mermaidMock,
  normalizeMermaidSvg: (svg: string) => svg,
}));

const suiteMock = {
  suite: { active: [], archived: [], deleted: [] },
  documentId: "legacy",
  loading: false,
  error: null,
  refresh: vi.fn(),
  selectDocument: vi.fn(),
  createDocument: vi.fn(),
  duplicateDocument: vi.fn(),
  renameDocument: vi.fn(),
  archiveDocument: vi.fn(),
  deleteDocument: vi.fn(),
  restoreDocument: vi.fn(),
};

vi.mock("../app/board/apps/aula-documentos/hooks/use-aula-document-suite", () => ({
  useAulaDocumentSuite: () => suiteMock,
}));

vi.mock("../app/board/apps/aula-documentos/hooks/use-aula-document-api", () => ({
  useAulaDocumentApi: () => ({
    load: documentMock.load,
    saveVersioned: documentMock.saveVersioned,
    loading: documentMock.loading,
    error: null,
  }),
}));

export { officeImportMock, documentMock, mermaidMock, printMock, copyMock, suiteMock };
export { WindowCloseProvider } from "../app/board/shared/window-close-guard";

/**
 * Botón de prueba que intenta cerrar la ventana como el control real.
 * @returns El botón de cierre.
 */
export function CloseTrigger() {
  const attemptClose = useWindowAttemptClose();
  return <button type="button" onClick={attemptClose}>Probar cierre</button>;
}

export const props = { projectId: "p1", role: "owner" as const };

type AulaMenu = "Archivo" | "Importar" | "Formato" | "Insertar" | "Exportar";

/**
 * Abre un menú de la barra de Aula Documentos.
 * @param name - Etiqueta del menú.
 */
export function openMenu(name: AulaMenu) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/**
 * Elige una acción de un menú.
 * @param menu - Menú que se abre.
 * @param item - Acción que se pulsa.
 */
export function chooseMenu(menu: AulaMenu, item: string) {
  openMenu(menu);
  fireEvent.click(screen.getByRole("menuitem", { name: item }));
}

export function newDocument() {
  chooseMenu("Archivo", "Nuevo documento");
}

export function openCopies() {
  chooseMenu("Archivo", "Copias portables");
}

export function importDocument() {
  chooseMenu("Importar", "Importar documento");
}

export function insertMermaid() {
  chooseMenu("Insertar", "Insertar diagrama Mermaid");
}

export function insertSlideBreak() {
  chooseMenu("Insertar", "Insertar salto de diapositiva");
}

export function printPdf() {
  chooseMenu("Exportar", "Imprimir o guardar PDF");
}

/**
 * Cuenta bloques Mermaid en un JSON de documento.
 * @param content - Contenido Tiptap.
 * @returns Número de bloques.
 */
export function countMermaid(content: unknown): number {
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
export function savedDocument(title: string): AulaDocument {
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
export function stubDownload() {
  const createObjectURL = vi.fn(() => "blob:copia");
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return createObjectURL;
}

/**
 * Devuelve los mocks de Aula a su estado base después de cada prueba.
 */
export function resetAulaDocumentMocks() {
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
}
