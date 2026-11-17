import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STARTER_TIMELINE,
  buildTimelineItems,
  formatTimelineDate,
  isValidTimelineDate,
  isValidTimelineRange,
  timelineGroupLabel,
  timelineWindow,
} from "./timeline-model";

const timelineMock = vi.hoisted(() => {
  const instance = {
    setItems: vi.fn(),
    setGroups: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fit: vi.fn(),
    setWindow: vi.fn(),
    setSelection: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  };
  const Timeline = vi.fn(function timelineConstructor() {
    return instance;
  });
  return { instance, Timeline };
});

vi.mock("vis-timeline/standalone", () => ({
  Timeline: timelineMock.Timeline,
}));

import TimelineApp from "./timeline-app";

describe("modelo de líneas de tiempo", () => {
  it("convierte el ejemplo en eventos y épocas de fondo", () => {
    const items = buildTimelineItems(STARTER_TIMELINE);
    expect(items).toHaveLength(7);
    expect(items.filter((item) => item.type === "background")).toHaveLength(2);
    expect(items.some((item) => item.content === "Sputnik 1" && item.type === "box")).toBe(true);
    expect(items.find((item) => item.content === "Carrera espacial")?.className).toContain("timeline-epoch--violet");
  });

  it("valida fechas y rangos", () => {
    expect(isValidTimelineDate("2024-02-29")).toBe(true);
    expect(isValidTimelineDate("2023-02-29")).toBe(false);
    expect(isValidTimelineDate("1969-07-20")).toBe(true);
    expect(isValidTimelineRange("1969-07-20", "1969-07-21")).toBe(true);
    expect(isValidTimelineRange("1969-07-21", "1969-07-20")).toBe(false);
  });

  it("formatea fechas y grupos para la interfaz", () => {
    expect(formatTimelineDate("1957-10-04")).toContain("1957");
    expect(timelineGroupLabel("misiones")).toBe("Misiones");
    expect(timelineGroupLabel("desconocido")).toBe("Hitos");
  });

  it("calcula un rango visible que cubre eventos y épocas", () => {
    const range = timelineWindow(STARTER_TIMELINE);
    expect(range?.start.getFullYear()).toBeLessThanOrEqual(1947);
    expect(range?.end.getFullYear()).toBeGreaterThanOrEqual(1991);
  });
});

describe("Líneas de tiempo", () => {
  afterEach(() => {
    vi.clearAllMocks();
    timelineMock.Timeline.mockImplementation(function timelineFactory() {
      return timelineMock.instance;
    });
  });

  it("muestra el ejemplo y monta el lienzo temporal", async () => {
    render(<TimelineApp />);

    expect(screen.getByText("Líneas de tiempo")).toBeTruthy();
    expect(screen.getByText("Sputnik 1")).toBeTruthy();
    expect(screen.getByText("Carrera espacial")).toBeTruthy();

    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());
    expect(timelineMock.Timeline).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.arrayContaining([expect.objectContaining({ content: "Sputnik 1" })]),
      expect.arrayContaining([expect.objectContaining({ content: "Misiones" })]),
      expect.objectContaining({ stack: true }),
    );
  });

  it("añade un evento con fechas y grupo", async () => {
    render(<TimelineApp />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Primer paseo espacial" } });
    fireEvent.change(screen.getByLabelText("Grupo"), { target: { value: "misiones" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "1965-03-18" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir evento" }));

    expect(screen.getByText("Primer paseo espacial")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Evento añadido");
    await waitFor(() => {
      const items = timelineMock.instance.setItems.mock.calls.at(-1)?.[0] as Array<{ content: string }>;
      expect(items.some((item) => item.content === "Primer paseo espacial")).toBe(true);
    });
  });

  it("edita y elimina un evento", async () => {
    render(<TimelineApp />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Editar Sputnik 1" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Sputnik 1 (editado)" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar evento" }));

    expect(screen.getByText("Sputnik 1 (editado)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Sputnik 1 (editado)" }));
    expect(screen.queryByText("Sputnik 1 (editado)")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("eliminado");
  });

  it("añade y elimina una época", async () => {
    render(<TimelineApp />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Etiqueta de la época"), { target: { value: "Años 2000" } });
    fireEvent.change(screen.getByLabelText("Inicio de la época"), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText("Fin de la época"), { target: { value: "2010-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir época" }));

    expect(screen.getByText("Años 2000")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Años 2000" }));
    expect(screen.queryByText("Años 2000")).toBeNull();
  });

  it("controla el zoom y recentra el lienzo", async () => {
    render(<TimelineApp />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(timelineMock.instance.zoomIn).toHaveBeenCalledWith(0.3);
    fireEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(timelineMock.instance.zoomOut).toHaveBeenCalledWith(0.3);
    fireEvent.click(screen.getByRole("button", { name: "Recentrar vista" }));
    expect(timelineMock.instance.setWindow).toHaveBeenCalled();
  });

  it("muestra un aviso si el visor no se puede iniciar", async () => {
    timelineMock.Timeline.mockImplementationOnce(function timelineError() {
      throw new Error("sin lienzo");
    });

    render(<TimelineApp />);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
