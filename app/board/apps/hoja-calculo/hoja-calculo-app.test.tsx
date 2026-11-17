import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STARTER_SHEET } from "./hoja-calculo-model";

const spreadsheetMock = vi.hoisted(() => {
  const worksheet = {
    getSelection: vi.fn(() => [0, 0, 1, 1] as [number, number, number, number]),
    setStyle: vi.fn(),
    insertRow: vi.fn(),
    insertColumn: vi.fn(),
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

vi.mock("jspreadsheet-ce", () => ({
  default: spreadsheetMock.jspreadsheet,
}));

import HojaCalculoApp from "./hoja-calculo-app";

describe("Hoja de cálculo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("monta la rejilla con la hoja de ejemplo", async () => {
    render(<HojaCalculoApp />);

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
    render(<HojaCalculoApp />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Añadir fila" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir columna" }));

    expect(spreadsheetMock.worksheet.insertRow).toHaveBeenCalled();
    expect(spreadsheetMock.worksheet.insertColumn).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("Columna añadida");
  });

  it("aplica formato a la selección y lo limpia", async () => {
    render(<HojaCalculoApp />);
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
    render(<HojaCalculoApp />);
    await waitFor(() => expect(spreadsheetMock.jspreadsheet).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar hoja" }));

    expect(spreadsheetMock.worksheet.setData).toHaveBeenCalledWith(STARTER_SHEET);
    expect(screen.getByRole("status").textContent).toContain("Hoja reiniciada");
  });

  it("muestra un aviso si la librería no se puede iniciar", async () => {
    spreadsheetMock.jspreadsheet.mockImplementationOnce(() => {
      throw new Error("sin rejilla");
    });

    render(<HojaCalculoApp />);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
