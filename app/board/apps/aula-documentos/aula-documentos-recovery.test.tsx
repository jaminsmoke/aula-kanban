import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AulaDocument } from "../../../../lib/domain/aula-documentos/document";
import { saveAulaRecoveryCopy } from "../../../../lib/domain/aula-documentos/recovery";
import { listDocumentRecoveryCopies } from "../../../../lib/domain/aula-documentos/recovery-document";
import {
  documentMock,
  insertMermaid,
  newDocument,
  props,
  resetAulaDocumentMocks,
  savedDocument,
  stubDownload,
} from "../../../../test-utils/aula-documentos";
import AulaDocumentosApp, { AUTOSAVE_DELAY_MS } from "./aula-documentos-app";

describe("Recuperación y plantillas de Aula Documentos", () => {
  afterEach(resetAulaDocumentMocks);

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
    expect(listDocumentRecoveryCopies(window.localStorage, "p1", "legacy")[0]).toMatchObject({
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
