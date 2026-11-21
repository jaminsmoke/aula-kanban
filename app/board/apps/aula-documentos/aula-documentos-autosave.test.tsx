import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { listDocumentRecoveryCopies } from "../../../../lib/domain/aula-documentos/recovery-document";
import {
  countMermaid,
  documentMock,
  insertMermaid,
  openMenu,
  props,
  resetAulaDocumentMocks,
  savedDocument,
  stubDownload,
} from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp, { AUTOSAVE_DELAY_MS } from "./aula-documentos-app";

describe("Autosave y conflictos de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

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
    expect(listDocumentRecoveryCopies(window.localStorage, "p1", "legacy")[0]).toMatchObject({
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
    expect(listDocumentRecoveryCopies(window.localStorage, "p1", "legacy")[0]).toMatchObject({
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
