import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STARTER_SHEET } from "./hoja-calculo-model";

const spreadsheetMock = vi.hoisted(() => {
  const worksheet = {
    getSelection: vi.fn(() => [0, 0, 1, 1] as [number, number, number, number]),
    setStyle: vi.fn(),
    getStyle: vi.fn(() => ({})),
    insertRow: vi.fn(),
    insertColumn: vi.fn(),
    resetStyle: vi.fn(),
    getData: vi.fn(() => [["Concepto", "Cantidad"], ["Materiales", 2]]),
    setData: vi.fn(),
  };
  const instance = { worksheets: [worksheet] };
  const jspreadsheet = vi.fn((_element: HTMLDivElement, options: {
    onload?: (instance: unknown) => void;
  }) => {
    options.onload?.(instance);
    return [];
  });
  return { instance, worksheet, jspreadsheet };
});

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
}));

vi.mock("jspreadsheet-ce", () => ({
  default: spreadsheetMock.jspreadsheet,
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    loading: false,
    error: null,
  }),
}));

import HojaCalculoApp from "./hoja-calculo-app";

const props = { projectId: "p1", role: "owner" as const };

describe("Hoja de cálculo", () => {
  afterEach(() => {
    vi.clearAllMocks();
    spreadsheetMock.worksheet.getStyle.mockReturnValue({});
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });

  it("monta la rejilla con la hoja de ejemplo", async () => {
    render(<HojaCalculoApp {...props} />);

    expect(screen.getByText("Hoja de cálculo")).toBeTruthy();
    expect(screen.getByText("Presupuesto de ejemplo")).toBeTruthy();
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      worksheets: Array<{ data: unknown; minDimensions?: number[] }>;
    };
    expect(options.worksheets[0].data).toEqual(STARTER_SHEET);
    expect(options.worksheets[0].minDimensions).toEqual([6, 20]);
  });

  it("añade filas y columnas", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir columna" }));

    expect(spreadsheetMock.worksheet.insertRow).toHaveBeenCalled();
    expect(spreadsheetMock.worksheet.insertColumn).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("Columna añadida");
  });

  it("aplica formato a la selección y lo limpia", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Negrita" }));
    expect(spreadsheetMock.worksheet.setStyle).toHaveBeenCalledWith("A1:B2", "font-weight", "bold");

    fireEvent.click(screen.getByRole("button", { name: "Cursiva" }));
    expect(spreadsheetMock.worksheet.setStyle).toHaveBeenCalledWith("A1:B2", "font-style", "italic");

    fireEvent.click(screen.getByRole("button", { name: "Centrar" }));
    expect(spreadsheetMock.worksheet.setStyle).toHaveBeenCalledWith("A1:B2", "text-align", "center");

    fireEvent.click(screen.getByRole("button", { name: "Limpiar formato" }));
    expect(spreadsheetMock.worksheet.setStyle).toHaveBeenCalledWith("A1:B2", "font-weight", "");
  });

  it("reinicia la hoja al ejemplo", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar hoja" }));

    expect(spreadsheetMock.worksheet.setData).toHaveBeenCalledWith(STARTER_SHEET);
    expect(screen.getByRole("status").textContent).toContain("Hoja reiniciada");
  });

  it("guarda la hoja y su formato", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Guardar hoja" }));

    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as { data: unknown[][]; styles: Record<string, string> };
    expect(saved.data).toHaveLength(20);
    expect(saved.styles).toEqual({});
    expect(screen.getByRole("status").textContent).toContain("guardada en el proyecto");
  });

  it("carga una hoja guardada", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { data: [["Guardada", "=1+1"]] },
      updatedAt: 1,
    });

    render(<HojaCalculoApp {...props} />);

    await waitFor(() => expect(spreadsheetMock.worksheet.setData).toHaveBeenCalled());
    expect(screen.getByRole("status").textContent).toContain("guardada cargada");
  });

  it("aplica el formato guardado al cargar", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { data: [["Guardada"]], styles: { A1: "font-weight:bold" } },
      updatedAt: 1,
    });

    render(<HojaCalculoApp {...props} />);

    await waitFor(() => expect(spreadsheetMock.worksheet.setStyle).toHaveBeenCalledWith({ A1: "font-weight:bold" }));
    expect(spreadsheetMock.worksheet.setData).toHaveBeenCalled();
  });

  it("deja la hoja en solo lectura para invitados", async () => {
    render(<HojaCalculoApp projectId="p1" role="guest" />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Añadir fila" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Guardar hoja" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toHaveProperty("disabled", false);
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      worksheets: Array<{ editable?: boolean }>;
    };
    expect(options.worksheets[0].editable).toBe(false);
  });

  it("muestra un aviso si la librería no se puede iniciar", async () => {
    spreadsheetMock.jspreadsheet.mockImplementationOnce(() => {
      throw new Error("sin rejilla");
    });

    render(<HojaCalculoApp {...props} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
