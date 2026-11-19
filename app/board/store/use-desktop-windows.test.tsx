import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Gem } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoreTool } from "./tools";
import { useDesktopWindows } from "./use-desktop-windows";

const tool: StoreTool = {
  id: "prueba",
  name: "Prueba",
  description: "",
  tagline: "",
  categories: ["Educación"],
  subcategory: "Herramientas",
  cover: "",
  features: [],
  appVersion: "1.0.0",
  upstream: { name: "test", version: "1.0.0" },
  window: { width: 900, height: 600 },
  icon: Gem,
  roles: ["owner"],
};

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe() {}
  disconnect() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

let desktopRect = { width: 1200, height: 700 };
const originalRect = HTMLElement.prototype.getBoundingClientRect;

/**
 * Sustituye la medición del escritorio y expone el observador de tamaño.
 */
function stubDesktopMeasure() {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function measure(this: HTMLElement) {
    if (this.dataset.testid === "desktop") {
      return {
        ...desktopRect,
        x: 0,
        y: 0,
        top: 0,
        right: desktopRect.width,
        bottom: desktopRect.height,
        left: 0,
        toJSON: () => this,
      } as DOMRect;
    }
    return originalRect.call(this);
  });
}

/**
 * Escritorio mínimo para observar la geometría de sus ventanas.
 * @returns El escritorio y una acción para abrir la ventana de prueba.
 */
function DesktopHarness() {
  const { desktopRef, desktopSize, windows, open, zoom } = useDesktopWindows();
  const activeWindow = windows[0];
  return (
    <div ref={desktopRef} data-testid="desktop">
      <output data-testid="size">{`${desktopSize.width}x${desktopSize.height}`}</output>
      <output data-testid="geometry">
        {activeWindow ? `${activeWindow.position.x},${activeWindow.position.y},${activeWindow.size.width},${activeWindow.size.height}` : "sin ventana"}
      </output>
      <output data-testid="maximized">{activeWindow ? String(activeWindow.maximized) : "sin ventana"}</output>
      <button type="button" onClick={() => open(tool)}>Abrir</button>
      <button type="button" onClick={() => { if (activeWindow) zoom(activeWindow.tool.id); }}>Ampliar</button>
    </div>
  );
}

describe("ventanas del escritorio", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    desktopRect = { width: 1200, height: 700 };
    ResizeObserverMock.instances = [];
  });

  it("recoloca las ventanas abiertas cuando cambia el escritorio", async () => {
    stubDesktopMeasure();

    render(<DesktopHarness />);
    await waitFor(() => expect(screen.getByTestId("size").textContent).toBe("1200x700"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(screen.getByTestId("geometry").textContent).toBe("150,12,900,600"));

    desktopRect = { width: 390, height: 680 };
    act(() => { ResizeObserverMock.instances[0]?.trigger(); });

    expect(screen.getByTestId("size").textContent).toBe("390x680");
    expect(screen.getByTestId("geometry").textContent).toBe("12,12,366,600");
  });

  it("abre maximizada en un escritorio estrecho y vuelve a una ventana segura", async () => {
    desktopRect = { width: 390, height: 680 };
    stubDesktopMeasure();

    render(<DesktopHarness />);
    await waitFor(() => expect(screen.getByTestId("size").textContent).toBe("390x680"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(screen.getByTestId("maximized").textContent).toBe("true"));
    expect(screen.getByTestId("geometry").textContent).toBe("0,0,390,680");

    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));
    expect(screen.getByTestId("maximized").textContent).toBe("false");
    expect(screen.getByTestId("geometry").textContent).toBe("12,12,366,600");
  });

  it("restaura una ventana maximizada con la geometría del escritorio actual", async () => {
    stubDesktopMeasure();

    render(<DesktopHarness />);
    await waitFor(() => expect(screen.getByTestId("size").textContent).toBe("1200x700"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await waitFor(() => expect(screen.getByTestId("maximized").textContent).toBe("false"));
    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));
    expect(screen.getByTestId("maximized").textContent).toBe("true");

    desktopRect = { width: 390, height: 680 };
    act(() => { ResizeObserverMock.instances[0]?.trigger(); });
    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));

    expect(screen.getByTestId("maximized").textContent).toBe("false");
    expect(screen.getByTestId("geometry").textContent).toBe("12,12,366,600");
  });
});
