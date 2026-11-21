import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { PresentationView } from "../../shared/aula-documentos/presentation-view";
import {
  documentMock,
  insertMermaid,
  mermaidMock,
  newDocument,
  printMock,
  printPdf,
  props,
  resetAulaDocumentMocks,
} from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp, { AUTOSAVE_DELAY_MS } from "./aula-documentos-app";

describe("Presentación y editor de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

  it("edita la presentación desde la fuente Markdown", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Fuente Markdown" }));
    const source = await screen.findByLabelText("Fuente Markdown de la presentación") as HTMLTextAreaElement;
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
    await screen.findByRole("dialog", { name: "Nuevo documento" });
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
    await screen.findByRole("dialog", { name: "Nuevo documento" });
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
    await screen.findByRole("dialog", { name: "Nuevo documento" });
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

  it("guarda los ajustes de página y prepara el PDF de diapositivas", async () => {
    render(<AulaDocumentosApp {...props} />);
    await waitFor(() => expect(screen.getByLabelText("Contenido del documento")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Tamaño de página"), { target: { value: "letter" } });
    fireEvent.change(screen.getByLabelText("Orientación de página"), { target: { value: "landscape" } });
    fireEvent.change(screen.getByLabelText("Márgenes de página"), { target: { value: "narrow" } });
    fireEvent.click(screen.getByLabelText("Números de diapositiva"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar documento" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as AulaDocument;
    expect(saved.presentation?.page).toEqual({
      size: "letter",
      orientation: "landscape",
      margin: "narrow",
      slideNumbers: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "PDF de diapositivas" }));
    await waitFor(() => expect(printMock).toHaveBeenCalledTimes(1));
    const html = printMock.mock.calls[0][0] as string;
    expect(html).toContain("@page { size: letter landscape; margin: 8mm; }");
    expect(html).toContain('class="slide-number"');
    expect(html).not.toContain("Notas del orador");
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

  it("muestra notas y siguiente diapositiva en la vista de presentador", () => {
    const onExit = vi.fn();
    render(
      <PresentationView
        title="Clase"
        slides={["<h1>Uno</h1>", "<h2>Dos</h2>"]}
        notes={{ "0": "Nota uno" }}
        onExit={onExit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Presentador" }));
    const panel = screen.getByRole("complementary", { name: "Vista de presentador" });
    expect(within(panel).getByText("Nota uno")).toBeTruthy();
    expect(within(panel).getByRole("heading", { name: "Siguiente diapositiva" })).toBeTruthy();
    expect(within(panel).getByText("Dos")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalled();
  });

  it("avisa de la última diapositiva y de la ausencia de notas", () => {
    render(
      <PresentationView
        title="Cierre"
        slides={["<h1>Única</h1>"]}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Presentador" }));
    const panel = screen.getByRole("complementary", { name: "Vista de presentador" });
    expect(within(panel).getByText("Sin notas para esta diapositiva.")).toBeTruthy();
    expect(within(panel).getByText("Última diapositiva.")).toBeTruthy();
  });
});
