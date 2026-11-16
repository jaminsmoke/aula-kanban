import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setEngineStatus } from "./engine-status";

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
  window.localStorage.clear();
});

describe("carga de la calculadora", () => {
  it("no precarga al abrir la calculadora básica", () => {
    renderHook(() => useCalculator());
    expect(mocks.preload).not.toHaveBeenCalled();
  });

  it("expone el estado del motor y lo actualiza", () => {
    const { result } = renderHook(() => useCalculator());
    expect(result.current.engineStatus).toBe("idle");

    act(() => setEngineStatus("loading"));
    expect(result.current.engineStatus).toBe("loading");

    act(() => setEngineStatus("idle"));
  });

  it("precarga al entrar en Científica o abrir Ecuaciones", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => result.current.setKeypad("cientifica"));
    expect(mocks.preload).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleEquations());
    expect(mocks.preload).toHaveBeenCalledTimes(2);
  });

  it("guarda el último modo y precarga al abrir si era Científica", () => {
    window.localStorage.setItem("aula-kanban-calculator-mode", "cientifica");
    renderHook(() => useCalculator());
    expect(mocks.preload).toHaveBeenCalledTimes(1);
  });

  it("guarda el modo al cambiarlo", () => {
    const { result } = renderHook(() => useCalculator());
    act(() => result.current.setKeypad("cientifica"));
    expect(window.localStorage.getItem("aula-kanban-calculator-mode")).toBe("cientifica");

    act(() => result.current.setKeypad("basica"));
    expect(window.localStorage.getItem("aula-kanban-calculator-mode")).toBe("basica");
  });

  it("precarga por intención tras un retardo corto y se puede cancelar", () => {
    const { result } = renderHook(() => useCalculator());
    vi.useFakeTimers();

    act(() => result.current.requestPreload());
    act(() => { vi.advanceTimersByTime(119); });
    expect(mocks.preload).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(mocks.preload).toHaveBeenCalledTimes(1);

    act(() => result.current.requestPreload());
    act(() => result.current.cancelPreload());
    act(() => { vi.advanceTimersByTime(200); });
    expect(mocks.preload).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
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
