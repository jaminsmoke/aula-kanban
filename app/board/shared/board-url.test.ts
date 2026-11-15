import { describe, expect, it } from "vitest";
import { buildBoardUrl, parseBoardUrl } from "./board-url";

describe("parseBoardUrl", () => {
  it("usa Clase > Tareas cuando no hay parámetros", () => {
    expect(parseBoardUrl("")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?project=p1")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null });
  });

  it("lee vista y sección de la URL sin tocar el proyecto", () => {
    expect(parseBoardUrl("?project=p1&view=alumnos")).toEqual({ view: "alumnos", classSection: "tareas", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=administradores")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "administradores", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=apariencia")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "apariencia", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=tokens")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "tokens", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=almacenamiento")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "almacenamiento", app: null });
    expect(parseBoardUrl("?project=p1&view=documentacion")).toEqual({ view: "documentacion", classSection: "tareas", settingsSection: "cuenta", app: null });
  });

  it("lee la sección de calendario dentro de Clase", () => {
    expect(parseBoardUrl("?view=clase&section=calendario")).toEqual({ view: "clase", classSection: "calendario", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?project=p1&section=calendario")).toEqual({ view: "clase", classSection: "calendario", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?section=diario")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null });
  });

  it("lee la app a abrir en Mi espacio y la ignora fuera de esa vista", () => {
    expect(parseBoardUrl("?project=p1&view=espacio&app=mermaid")).toEqual({ view: "espacio", classSection: "tareas", settingsSection: "cuenta", app: "mermaid" });
    expect(parseBoardUrl("?project=p1&view=clase&app=mermaid")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null });
  });

  it("resuelve valores inválidos al defecto de la vista", () => {
    expect(parseBoardUrl("?view=inexistente")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?view=ajustes&section=tareas")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "cuenta", app: null });
    expect(parseBoardUrl("?view=clase&section=administradores")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "administradores", app: null });
  });
});

describe("buildBoardUrl", () => {
  it("omite los valores por defecto y conserva el proyecto", () => {
    expect(buildBoardUrl("?project=p1", { view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("?project=p1");
    expect(buildBoardUrl("", { view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("");
    expect(buildBoardUrl("?project=p1&view=ajustes", { view: "ajustes", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("?project=p1&view=ajustes");
  });

  it("escribe vista y sección no por defecto y limpia la sección al cambiar de vista", () => {
    expect(buildBoardUrl("?project=p1", { view: "alumnos", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("?project=p1&view=alumnos");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { view: "ajustes", classSection: "tareas", settingsSection: "administradores", app: null })).toBe("?project=p1&view=ajustes&section=administradores");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=apariencia", { view: "ajustes", classSection: "tareas", settingsSection: "apariencia", app: null })).toBe("?project=p1&view=ajustes&section=apariencia");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=tokens", { view: "ajustes", classSection: "tareas", settingsSection: "tokens", app: null })).toBe("?project=p1&view=ajustes&section=tokens");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=almacenamiento", { view: "ajustes", classSection: "tareas", settingsSection: "almacenamiento", app: null })).toBe("?project=p1&view=ajustes&section=almacenamiento");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { view: "alumnos", classSection: "tareas", settingsSection: "administradores", app: null })).toBe("?project=p1&view=alumnos");
  });

  it("escribe la sección de calendario y la omite al volver a Tareas", () => {
    expect(buildBoardUrl("?project=p1", { view: "clase", classSection: "calendario", settingsSection: "cuenta", app: null })).toBe("?project=p1&section=calendario");
    expect(buildBoardUrl("?project=p1&section=calendario", { view: "clase", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("?project=p1");
    expect(buildBoardUrl("?section=calendario", { view: "alumnos", classSection: "calendario", settingsSection: "cuenta", app: null })).toBe("?view=alumnos");
  });

  it("escribe app solo en Mi espacio y la limpia al cambiar de vista", () => {
    expect(buildBoardUrl("?project=p1", { view: "espacio", classSection: "tareas", settingsSection: "cuenta", app: "mermaid" })).toBe("?project=p1&view=espacio&app=mermaid");
    expect(buildBoardUrl("?project=p1&view=espacio&app=mermaid", { view: "espacio", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1&view=espacio");
    expect(buildBoardUrl("?project=p1&view=espacio&app=mermaid", { view: "clase", classSection: "tareas", settingsSection: "cuenta", app: "mermaid" })).toBe("?project=p1");
  });

  it("conserva parámetros desconocidos", () => {
    expect(buildBoardUrl("?project=p1&origen=correo", { view: "profesores", classSection: "tareas", settingsSection: "cuenta", app: null })).toBe("?project=p1&origen=correo&view=profesores");
  });

  it("hace roundtrip con parseBoardUrl", () => {
    const state = parseBoardUrl("?project=p1&view=ajustes&section=almacenamiento");
    expect(parseBoardUrl(buildBoardUrl("?project=p1", state))).toEqual(state);
  });
});
