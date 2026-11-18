import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const officeMock = vi.hoisted(() => {
  type Options = {
    onPageChange?: (index: number, total: number, layoutComplete: boolean) => void;
    onSlideChange?: (index: number, total: number, layoutComplete: boolean) => void;
    onSheetChange?: (index: number, total: number) => void;
    onScaleChange?: (scale: number) => void;
  };

  class FakeViewer {
    static instances: FakeViewer[] = [];
    static failNextLoad: unknown = null;
    kind = "docx";
    destroyed = vi.fn();
    zoomIn = vi.fn();
    zoomOut = vi.fn();
    fitWidth = vi.fn();
    fitPage = vi.fn();
    currentPage = 0;
    pageCount = 3;
    slideIndex = 0;
    slideCount = 4;
    sheetIndex = 0;
    sheetCount = 2;
    loaded: ArrayBuffer | null = null;

    constructor(public element: HTMLElement, public options: Options) {
      FakeViewer.instances.push(this);
    }

    async load(bytes: ArrayBuffer) {
      if (FakeViewer.failNextLoad) {
        const failure = FakeViewer.failNextLoad;
        FakeViewer.failNextLoad = null;
        throw failure;
      }
      this.loaded = bytes;
      this.options.onPageChange?.(0, this.pageCount, true);
      this.options.onSlideChange?.(0, this.slideCount, true);
      this.options.onSheetChange?.(0, this.sheetCount);
      this.options.onScaleChange?.(1);
    }

    destroy() { this.destroyed(); }
    getScale() { return 1; }
    nextPage = vi.fn(async () => {
      this.currentPage = Math.min(this.currentPage + 1, this.pageCount - 1);
      this.options.onPageChange?.(this.currentPage, this.pageCount, true);
    });
    prevPage = vi.fn(async () => {
      this.currentPage = Math.max(this.currentPage - 1, 0);
      this.options.onPageChange?.(this.currentPage, this.pageCount, true);
    });
    nextSlide = vi.fn(async () => {
      this.slideIndex = Math.min(this.slideIndex + 1, this.slideCount - 1);
      this.options.onSlideChange?.(this.slideIndex, this.slideCount, true);
    });
    prevSlide = vi.fn(async () => {
      this.slideIndex = Math.max(this.slideIndex - 1, 0);
      this.options.onSlideChange?.(this.slideIndex, this.slideCount, true);
    });
    nextSheet = vi.fn(async () => {
      this.sheetIndex = Math.min(this.sheetIndex + 1, this.sheetCount - 1);
      this.options.onSheetChange?.(this.sheetIndex, this.sheetCount);
    });
    prevSheet = vi.fn(async () => {
      this.sheetIndex = Math.max(this.sheetIndex - 1, 0);
      this.options.onSheetChange?.(this.sheetIndex, this.sheetCount);
    });
  }

  class DocxViewer extends FakeViewer {
    kind = "docx";
  }

  class XlsxViewer extends FakeViewer {
    kind = "xlsx";
  }

  class PptxViewer extends FakeViewer {
    kind = "pptx";
  }

  return {
    FakeViewer,
    DocxViewer,
    XlsxViewer,
    PptxViewer,
  };
});

vi.mock("@silurus/ooxml/docx", () => ({ DocxViewer: officeMock.DocxViewer }));
vi.mock("@silurus/ooxml/xlsx", () => ({ XlsxViewer: officeMock.XlsxViewer }));
vi.mock("@silurus/ooxml/pptx", () => ({ PptxViewer: officeMock.PptxViewer }));

/**
 * Instancias creadas para un formato.
 * @param kind - Formato buscado.
 * @returns Las instancias del visor simulado.
 */
function viewers(kind: string) {
  return officeMock.FakeViewer.instances.filter((viewer) => viewer.kind === kind);
}

import VisorOfficeApp from "./visor-office-app";
import { MAX_OFFICE_FILE_BYTES } from "./visor-office-model";

/**
 * Crea un archivo falso con `arrayBuffer` controlado.
 * @param name - Nombre del archivo.
 * @param size - Tamaño.
 * @returns El archivo para el selector.
 */
function fakeFile(name: string, size = 10): File {
  return {
    name,
    size,
    arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  } as unknown as File;
}

describe("Visor Office", () => {
  beforeEach(() => {
    officeMock.FakeViewer.instances = [];
    officeMock.FakeViewer.failNextLoad = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado vacío y valida la extensión", async () => {
    render(<VisorOfficeApp />);
    expect(screen.getByText("Abre un documento de Office")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elegir archivo" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("notas.pdf")] },
    });

    expect((await screen.findByRole("alert")).textContent).toContain("Solo se admiten archivos");
    expect(viewers("docx")).toHaveLength(0);
  });

  it("rechaza un archivo por encima de 30 MB antes de leerlo", async () => {
    render(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("enorme.docx", MAX_OFFICE_FILE_BYTES + 1)] },
    });

    expect((await screen.findByRole("alert")).textContent).toContain("30 MB");
    expect(viewers("docx")).toHaveLength(0);
  });

  it("traduce el fallo de apertura y ofrece elegir otro archivo", async () => {
    officeMock.FakeViewer.failNextLoad = { code: "encrypted" };
    render(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("protegido.docx")] },
    });

    expect((await screen.findByRole("alert")).textContent).toContain("contraseña");
    expect(screen.queryByRole("group", { name: /Documento/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Elegir otro archivo" })).toBeTruthy();
  });

  it("abre un DOCX, muestra la página y permite avanzar", async () => {
    render(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("clase.docx")] },
    });

    await waitFor(() => expect(viewers("docx")).toHaveLength(1));
    expect(screen.getByText("clase.docx")).toBeTruthy();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    const viewer = viewers("docx")[0];
    expect(viewer.loaded).toBeInstanceOf(ArrayBuffer);

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(screen.getByText("Página 2 de 3")).toBeTruthy());
  });

  it("permite navegar y ampliar con el teclado desde el documento", async () => {
    render(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("clase.docx")] },
    });
    await waitFor(() => expect(viewers("docx")).toHaveLength(1));
    const viewer = viewers("docx")[0];
    const host = screen.getByRole("group", { name: "Documento clase.docx" });

    host.focus();
    fireEvent.keyDown(host, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByText("Página 2 de 3")).toBeTruthy());
    fireEvent.keyDown(host, { key: "+" });
    expect(viewer.zoomIn).toHaveBeenCalledTimes(1);
  });

  it("abre XLSX y PPTX por su formato", async () => {
    const { rerender } = render(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("datos.xlsx")] },
    });
    await waitFor(() => expect(viewers("xlsx")).toHaveLength(1));
    expect(screen.getByText("Hoja 1 de 2")).toBeTruthy();

    rerender(<VisorOfficeApp />);
    fireEvent.change(screen.getByLabelText("Elegir archivo de Office"), {
      target: { files: [fakeFile("charla.pptx")] },
    });
    await waitFor(() => expect(viewers("pptx")).toHaveLength(1));
    expect(screen.getByText("Diapositiva 1 de 4")).toBeTruthy();
  });

  it("destruye el visor anterior al cambiar de archivo", async () => {
    render(<VisorOfficeApp />);
    const input = screen.getByLabelText("Elegir archivo de Office");
    fireEvent.change(input, { target: { files: [fakeFile("clase.docx")] } });
    await waitFor(() => expect(viewers("docx")).toHaveLength(1));
    const previous = viewers("docx")[0];

    fireEvent.change(input, { target: { files: [fakeFile("datos.xlsx")] } });
    await waitFor(() => expect(officeMock.FakeViewer.instances).toHaveLength(2));
    await waitFor(() => expect(previous.destroyed).toHaveBeenCalled());
    expect(screen.getByText("datos.xlsx")).toBeTruthy();
  });
});
