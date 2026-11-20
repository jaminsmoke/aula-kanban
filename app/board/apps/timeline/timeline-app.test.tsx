import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STARTER_TIMELINE,
  buildTimelineItems,
  formatTimelineDate,
  isValidTimelineDate,
  isValidTimelineRange,
  parseTimelineDocument,
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
    getWindow: vi.fn(() => ({
      start: new Date("1960-01-01T12:00:00"),
      end: new Date("1970-01-01T12:00:00"),
    })),
    setSelection: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  };
  const Timeline = vi.fn(function timelineConstructor() {
    return instance;
  });
  return { instance, Timeline };
});

const documentMock = vi.hoisted(() => ({
  load: vi.fn(async (): Promise<{ state: unknown; updatedAt: number | null }> => ({ state: null, updatedAt: null })),
  save: vi.fn(async (_state: unknown) => true),
}));

vi.mock("vis-timeline/standalone", () => ({
  Timeline: timelineMock.Timeline,
}));

vi.mock("../use-app-document", () => ({
  useAppDocument: () => ({
    load: documentMock.load,
    save: documentMock.save,
    loading: false,
    error: null,
  }),
}));

import TimelineApp from "./timeline-app";

const props = { projectId: "p1", role: "owner" as const };

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
    expect(timelineGroupLabel("procesos")).toBe("Procesos");
    expect(timelineGroupLabel("desconocido")).toBe("Hitos");
  });

  it("calcula un rango visible que cubre eventos y épocas", () => {
    const range = timelineWindow(STARTER_TIMELINE);
    expect(range?.start.getFullYear()).toBeLessThanOrEqual(1947);
    expect(range?.end.getFullYear()).toBeGreaterThanOrEqual(1991);
  });

  it("valida y rechaza documentos guardados", () => {
    expect(parseTimelineDocument(STARTER_TIMELINE)?.events).toHaveLength(5);
    expect(parseTimelineDocument({ events: [{ id: "x" }], epochs: [] })).toBeNull();
    expect(parseTimelineDocument(null)).toBeNull();
  });
});

describe("Líneas de tiempo", () => {
  afterEach(() => {
    vi.clearAllMocks();
    timelineMock.Timeline.mockImplementation(function timelineFactory() {
      return timelineMock.instance;
    });
    documentMock.load.mockResolvedValue({ state: null, updatedAt: null });
    documentMock.save.mockResolvedValue(true);
  });

  it("muestra el ejemplo y monta el lienzo temporal", async () => {
    render(<TimelineApp {...props} />);

    expect(screen.getByText("Líneas de tiempo")).toBeTruthy();
    expect(screen.getByText("Sputnik 1")).toBeTruthy();
    expect(screen.getAllByText("Carrera espacial").length).toBeGreaterThan(0);

    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());
    expect(timelineMock.Timeline).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.arrayContaining([expect.objectContaining({ content: "Sputnik 1" })]),
      expect.arrayContaining([expect.objectContaining({ content: "Procesos" })]),
      expect.objectContaining({ stack: true }),
    );
  });

  it("añade un evento con fechas y grupo", async () => {
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Primer paseo espacial" } });
    fireEvent.change(screen.getByLabelText("Grupo"), { target: { value: "procesos" } });
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
    render(<TimelineApp {...props} />);
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
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Etiqueta de la época"), { target: { value: "Años 2000" } });
    fireEvent.change(screen.getByLabelText("Inicio de la época"), { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByLabelText("Fin de la época"), { target: { value: "2010-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir época" }));

    expect(screen.getByText("Años 2000")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Años 2000" }));
    expect(screen.queryByText("Años 2000")).toBeNull();
  });

  it("edita una época existente", async () => {
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Editar Carrera espacial" }));
    fireEvent.change(screen.getByLabelText("Etiqueta de la época"), { target: { value: "Carrera espacial (editada)" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar época" }));

    expect(screen.getByText("Carrera espacial (editada)")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Época actualizada");
  });

  it("aplica la plantilla de proyecto", async () => {
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "proyecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plantilla" }));

    expect(screen.getByText("Presentación del proyecto")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Plantilla «Proyecto de aula» aplicada");
  });

  it("guarda el documento y el rango visible", async () => {
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(documentMock.save).toHaveBeenCalledTimes(1));
    const saved = documentMock.save.mock.calls[0][0] as { events: unknown[]; epochs: unknown[]; range?: unknown };
    expect(saved.events).toHaveLength(5);
    expect(saved.epochs).toHaveLength(2);
    expect(saved.range).toBeDefined();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("guardada en el proyecto"));
  });

  it("carga un documento guardado", async () => {
    documentMock.load.mockResolvedValueOnce({
      state: {
        ...STARTER_TIMELINE,
        events: STARTER_TIMELINE.events.map((event) => (
          event.id === "sputnik" ? { ...event, title: "Sputnik guardado" } : event
        )),
        range: { start: "1950-01-01", end: "1990-01-01" },
      },
      updatedAt: 1,
    });

    render(<TimelineApp {...props} />);

    expect(await screen.findByText("Sputnik guardado")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("guardada cargada");
    await waitFor(() => expect(timelineMock.instance.setWindow).toHaveBeenCalled());
  });

  it("deja la línea temporal en solo lectura para invitados", async () => {
    render(<TimelineApp projectId="p1" role="guest" />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    expect(screen.getByText(/Modo lectura/)).toBeTruthy();
    expect(screen.getByLabelText("Título")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Editar Sputnik 1" })).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Modelo")).toHaveProperty("disabled", true);
  });

  it("controla el zoom, el recentrado y el teclado", async () => {
    render(<TimelineApp {...props} />);
    await waitFor(() => expect(timelineMock.Timeline).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(timelineMock.instance.zoomIn).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(timelineMock.instance.zoomOut).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recentrar vista" }));
    expect(timelineMock.instance.setWindow).toHaveBeenCalled();

    const canvas = screen.getByRole("application");
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(timelineMock.instance.setWindow).toHaveBeenCalledTimes(2);
  });

  it("muestra un aviso si el visor no se puede iniciar", async () => {
    timelineMock.Timeline.mockImplementationOnce(function timelineError() {
      throw new Error("sin lienzo");
    });

    render(<TimelineApp {...props} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
