import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMermaidVisibility } from "./use-mermaid-visibility";

describe("visibilidad de diagramas Mermaid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("se muestra sin IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const element = document.createElement("div");
    const { result } = renderHook(() => useMermaidVisibility({ current: element }));
    expect(result.current).toBe(true);
  });

  it("espera a que el bloque entre en el viewport", () => {
    let callback: IntersectionObserverCallback | null = null;
    const observers: FakeObserver[] = [];
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
        observers.push(this);
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = "0px";
      thresholds = [0];
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);

    const element = document.createElement("div");
    const { result } = renderHook(() => useMermaidVisibility({ current: element }));
    expect(result.current).toBe(false);

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(result.current).toBe(true);
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });
});
