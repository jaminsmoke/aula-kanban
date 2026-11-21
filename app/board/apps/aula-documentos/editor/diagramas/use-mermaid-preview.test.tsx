import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMermaidPreview } from "./use-mermaid-preview";

const renderMock = vi.hoisted(() => vi.fn(async (code: string) => `<svg data-code="${code}" />`));

vi.mock("./mermaid-renderer", () => ({
  getMermaidRenderer: () => ({ render: renderMock }),
}));

describe("vista previa Mermaid", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("no renderiza hasta que el bloque es visible", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useMermaidPreview("flowchart TD\nA --> B", enabled),
      { initialProps: { enabled: false } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(renderMock).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    rerender({ enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(result.current.svg).toContain("<svg");
  });
});
