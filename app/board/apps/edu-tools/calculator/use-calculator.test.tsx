import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  preload: vi.fn(),
  evaluate: vi.fn(),
  basic: vi.fn(),
}));

vi.mock("./edu-evaluate", () => ({
  evaluateLatex: mocks.evaluate,
  preloadEngine: mocks.preload,
}));

vi.mock("./basic-evaluate", () => ({ evaluateBasic: mocks.basic }));

import { useCalculator } from "./use-calculator";

beforeEach(() => {
  mocks.preload.mockClear();
  mocks.evaluate.mockReset();
  mocks.basic.mockReset();
  mocks.basic.mockReturnValue(null);
});

describe("carga de la calculadora", () => {
  it("no precarga al abrir la calculadora básica", () => {
    renderHook(() => useCalculator());
    expect(mocks.preload).not.toHaveBeenCalled();
  });

  it("precarga al entrar en Científica o abrir Ecuaciones", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => result.current.setKeypad("cientifica"));
    expect(mocks.preload).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleEquations());
    expect(mocks.preload).toHaveBeenCalledTimes(2);
  });

  it("evalúa la Básica sin delegar en el motor", async () => {
    mocks.basic.mockReturnValue({ kind: "value", exact: "5", latex: "5", numeric: "5", isNumeric: true });
    const { result } = renderHook(() => useCalculator());

    act(() => {
      result.current.press({ label: "2", token: "2", aria: "2" });
      result.current.press({ label: "+", token: "+", aria: "Sumar" });
      result.current.press({ label: "3", token: "3", aria: "3" });
    });
    await act(async () => {
      result.current.press({ label: "=", action: "equals", aria: "Igual" });
    });

    expect(mocks.basic).toHaveBeenCalledWith("2+3");
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(result.current.shown).toBe("5");
  });

  it("delega en el motor al calcular en Científica", async () => {
    mocks.evaluate.mockResolvedValue({ kind: "value", exact: "5", latex: "5", numeric: "5", isNumeric: true });
    const { result } = renderHook(() => useCalculator());

    act(() => result.current.setKeypad("cientifica"));
    act(() => {
      result.current.press({ label: "2", token: "2", aria: "2" });
      result.current.press({ label: "+", token: "+", aria: "Sumar" });
      result.current.press({ label: "3", token: "3", aria: "3" });
    });
    await act(async () => {
      result.current.press({ label: "=", action: "equals", aria: "Igual" });
    });

    expect(mocks.basic).not.toHaveBeenCalled();
    expect(mocks.evaluate).toHaveBeenCalledWith("2+3");
    expect(result.current.shown).toBe("5");
  });
});
