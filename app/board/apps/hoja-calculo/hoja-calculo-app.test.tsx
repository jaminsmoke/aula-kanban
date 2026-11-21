import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VersionedSaveResult } from "../use-app-document";
import { computeSheetDisplay } from "./hoja-calculo-calc";
import { STARTER_SHEET } from "./hoja-calculo-model";

const spreadsheetMock = vi.hoisted(() => {
  const worksheet = {
    getSelection: vi.fn(() => [0, 0, 1, 1] as [number, number, number, number]),
    setStyle: vi.fn(),
    getStyle: vi.fn(() => ({})),
    insertRow: vi.fn(),
    insertColumn: vi.fn(),
    resetStyle: vi.fn(),
    getData: vi.fn((): (string | number | boolean)[][] => [["Concepto", "Cantidad"], ["Materiales", 2]]),
    getValueFromCoords: vi.fn((): string | number | boolean | null => ""),
    setData: vi.fn(),
    setValueFromCoords: vi.fn(),
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
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null; ok?: boolean }> => ({ state: null, updatedAt: null, ok: true })),
  saveVersioned: vi.fn(async (_state: unknown, _updatedAt: number | null): Promise<VersionedSaveResult> => ({ status: "saved", updatedAt: 100 })),
}));

vi.mock("jspreadsheet-ce", () => ({
  default: spreadsheetMock.jspreadsheet,
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    saveVersioned: documentMock.saveVersioned,
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
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null, ok: true });
    documentMock.saveVersioned.mockResolvedValue({ status: "saved", updatedAt: 100 });
  });

  it("monta la rejilla con la hoja de ejemplo", async () => {
    render(<HojaCalculoApp {...props} />);

    expect(screen.getByText("Hoja de cálculo")).toBeTruthy();
    expect(screen.getByText("Presupuesto de ejemplo")).toBeTruthy();
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      parseFormulas: boolean;
      parseHTML: boolean;
      worksheets: Array<{ data: unknown; minDimensions?: number[] }>;
    };
    expect(options).toMatchObject({ parseFormulas: false, parseHTML: false });
    expect(options.worksheets[0].data).toEqual(computeSheetDisplay(STARTER_SHEET));
    expect(options.worksheets[0].minDimensions).toEqual([6, 20]);
    expect(screen.getByText("Cálculo correcto")).toBeTruthy();
    expect(screen.getByText("4 fórmulas")).toBeTruthy();
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

    expect(spreadsheetMock.worksheet.setData).toHaveBeenCalledWith(computeSheetDisplay(STARTER_SHEET));
    expect(screen.getByRole("status").textContent).toContain("Hoja reiniciada");
  });

  it("reinicia desde una copia aunque la rejilla mute la hoja inicial", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      worksheets: Array<{ data: Array<Array<string | number | boolean>> }>;
    };
    options.worksheets[0].data[3][1] = 99;

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar hoja" }));

    expect(spreadsheetMock.worksheet.setData).toHaveBeenCalledWith(computeSheetDisplay(STARTER_SHEET));
    const reset = spreadsheetMock.worksheet.setData.mock.calls.at(-1)?.[0] as Array<Array<string | number | boolean>>;
    expect(reset[3][1]).toBe(1);
  });

  it("guarda la hoja y su formato", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Guardar hoja" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    const saved = documentMock.saveVersioned.mock.calls[0][0] as { data: unknown[][]; styles: Record<string, string> };
    expect(saved.data).toHaveLength(20);
    expect(saved.styles).toEqual({});
    expect(screen.getByRole("status").textContent).toContain("guardada en el proyecto");
  });

  it("guarda las fórmulas originales aunque la rejilla muestre resultados", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(computeSheetDisplay(STARTER_SHEET));

    fireEvent.click(screen.getByRole("button", { name: "Guardar hoja" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledTimes(1));
    const saved = documentMock.saveVersioned.mock.calls[0][0] as { data: string[][] };
    expect(saved.data[2][3]).toBe("=B3*C3");
    expect(saved.data[5][3]).toBe("=SUM(D3:D5)");
  });

  it("conserva el borrador y avisa si la hoja cambió en otra sesión", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { data: [["Guardada", "=1+1"]] },
      updatedAt: 7,
      ok: true,
    });
    documentMock.saveVersioned.mockResolvedValueOnce({ status: "conflict", updatedAt: 9 });
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Guardar hoja" }));

    await waitFor(() => expect(documentMock.saveVersioned).toHaveBeenCalledWith(expect.anything(), 7));
    expect(screen.getByRole("status").textContent).toContain("otra sesión");
    expect(screen.getByRole("status").textContent).toContain("Cambios sin guardar");
  });

  it("no guarda una hoja nueva si falla la carga inicial", async () => {
    documentMock.load.mockResolvedValueOnce({ state: null, updatedAt: null, ok: false });
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Guardar hoja" }));

    expect(documentMock.saveVersioned).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("No se puede guardar");
  });

  it("recalcula los totales al editar una cantidad", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      onchange?: (instance: unknown, cell: unknown, col: number, row: number, value: unknown) => void;
    };
    const display = computeSheetDisplay(STARTER_SHEET);
    display[2][1] = 4;
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(display);

    options.onchange?.(spreadsheetMock.worksheet, {}, 1, 2, 4);

    expect(spreadsheetMock.worksheet.setValueFromCoords).toHaveBeenCalledWith(3, 2, 18, true);
    expect(spreadsheetMock.worksheet.setValueFromCoords).toHaveBeenCalledWith(3, 5, 36.5, true);
  });

  it("recalcula una fórmula nueva sin perderla", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      onchange?: (instance: unknown, cell: unknown, col: number, row: number, value: unknown) => void;
    };
    const display = computeSheetDisplay(STARTER_SHEET);
    display[6][3] = "=B3*C3";
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(display);

    options.onchange?.(spreadsheetMock.worksheet, {}, 3, 6, "=B3*C3");

    expect(spreadsheetMock.worksheet.setValueFromCoords).toHaveBeenCalledWith(3, 6, 13.5, true);
  });

  it("edita la fórmula de una celda calculada desde la barra fx", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      onselection?: (instance: unknown, left: number, top: number, right: number, bottom: number, origin?: unknown) => void;
    };
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(computeSheetDisplay(STARTER_SHEET));
    options.onselection?.(spreadsheetMock.worksheet, 3, 2, 3, 2);

    const input = screen.getByLabelText("Fórmula de la celda seleccionada") as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe("=B3*C3"));
    fireEvent.change(input, { target: { value: "=B3*C3*2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(spreadsheetMock.worksheet.setValueFromCoords).toHaveBeenCalledWith(3, 2, 27, true);
  });

  it("muestra un error de fórmula sin romper la rejilla", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      onchange?: (instance: unknown, cell: unknown, col: number, row: number, value: unknown) => void;
    };
    const display = computeSheetDisplay(STARTER_SHEET);
    display[7][3] = "=B3*";
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(display);

    options.onchange?.(spreadsheetMock.worksheet, {}, 3, 7, "=B3*");

    expect(spreadsheetMock.worksheet.setValueFromCoords).toHaveBeenCalledWith(3, 7, "#VALOR!", true);
    await waitFor(() => expect(screen.getByText("1 celda con error")).toBeTruthy());
    expect(screen.getByText("D8")).toBeTruthy();
  });

  it("muestra los límites alcanzados y los limpia al reiniciar", async () => {
    render(<HojaCalculoApp {...props} />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());
    const options = spreadsheetMock.jspreadsheet.mock.calls[0][1] as {
      onchange?: (instance: unknown, cell: unknown, col: number, row: number, value: unknown) => void;
    };
    const display = computeSheetDisplay(STARTER_SHEET);
    display[7][3] = "=SUM(A1:ZZ1000)";
    spreadsheetMock.worksheet.getData.mockReturnValueOnce(display);

    options.onchange?.(spreadsheetMock.worksheet, {}, 3, 7, "=SUM(A1:ZZ1000)");

    await waitFor(() => expect(screen.getByText("1 celda con error")).toBeTruthy());
    expect(screen.getByText(/Límite alcanzado: rango demasiado grande/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar hoja" }));

    await waitFor(() => expect(screen.getByText("Cálculo correcto")).toBeTruthy());
    expect(screen.getByText("4 fórmulas")).toBeTruthy();
  });

  it("carga una hoja guardada", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: { data: [["Guardada", "=1+1"]] },
      updatedAt: 1,
    });

    render(<HojaCalculoApp {...props} />);

    await waitFor(() => {
      const loaded = spreadsheetMock.worksheet.setData.mock.calls.at(-1)?.[0] as Array<Array<string | number | boolean>>;
      expect(loaded[0][1]).toBe(2);
    });
    expect(screen.getByRole("status").textContent).toContain("guardada cargada");
    expect(screen.getByText("1 fórmula")).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Reiniciar hoja" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Fórmula de la celda seleccionada")).toHaveProperty("disabled", true);
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
