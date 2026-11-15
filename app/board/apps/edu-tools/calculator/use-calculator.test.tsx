import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  preload: vi.fn(),
  evaluate: vi.fn(),
}));

vi.mock("./edu-evaluate", () => ({
  evaluateLatex: mocks.evaluate,
  preloadEngine: mocks.preload,
}));

import { useCalculator } from "./use-calculator";

beforeEach(() => {
  mocks.preload.mockClear();
  mocks.evaluate.mockReset();
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
});
