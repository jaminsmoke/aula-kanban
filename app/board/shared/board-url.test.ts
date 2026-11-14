import { describe, expect, it } from "vitest";
import { buildBoardUrl, parseBoardUrl } from "./board-url";

describe("parseBoardUrl", () => {
  it("usa Clase > Tareas cuando no hay parámetros", () => {
    expect(parseBoardUrl("")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta" });
    expect(parseBoardUrl("?project=p1")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta" });
  });

  it("lee vista y sección de la URL sin tocar el proyecto", () => {
    expect(parseBoardUrl("?project=p1&view=alumnos")).toEqual({ view: "alumnos", classSection: "tareas", settingsSection: "cuenta" });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=administradores")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "administradores" });
    expect(parseBoardUrl("?project=p1&view=documentacion")).toEqual({ view: "documentacion", classSection: "tareas", settingsSection: "cuenta" });
  });

  it("lee la sección de calendario dentro de Clase", () => {
    expect(parseBoardUrl("?view=clase&section=calendario")).toEqual({ view: "clase", classSection: "calendario", settingsSection: "cuenta" });
    expect(parseBoardUrl("?project=p1&section=calendario")).toEqual({ view: "clase", classSection: "calendario", settingsSection: "cuenta" });
    expect(parseBoardUrl("?section=diario")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta" });
  });

  it("resuelve valores inválidos al defecto de la vista", () => {
    expect(parseBoardUrl("?view=inexistente")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "cuenta" });
    expect(parseBoardUrl("?view=ajustes&section=tareas")).toEqual({ view: "ajustes", classSection: "tareas", settingsSection: "cuenta" });
    expect(parseBoardUrl("?view=clase&section=administradores")).toEqual({ view: "clase", classSection: "tareas", settingsSection: "administradores" });
  });
});

describe("buildBoardUrl", () => {
  it("omite los valores por defecto y conserva el proyecto", () => {
    expect(buildBoardUrl("?project=p1", { view: "clase", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1");
    expect(buildBoardUrl("", { view: "clase", classSection: "tareas", settingsSection: "cuenta" })).toBe("");
    expect(buildBoardUrl("?project=p1&view=ajustes", { view: "ajustes", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1&view=ajustes");
  });

  it("escribe vista y sección no por defecto y limpia la sección al cambiar de vista", () => {
    expect(buildBoardUrl("?project=p1", { view: "alumnos", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1&view=alumnos");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { view: "ajustes", classSection: "tareas", settingsSection: "administradores" })).toBe("?project=p1&view=ajustes&section=administradores");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { view: "alumnos", classSection: "tareas", settingsSection: "administradores" })).toBe("?project=p1&view=alumnos");
  });

  it("escribe la sección de calendario y la omite al volver a Tareas", () => {
    expect(buildBoardUrl("?project=p1", { view: "clase", classSection: "calendario", settingsSection: "cuenta" })).toBe("?project=p1&section=calendario");
    expect(buildBoardUrl("?project=p1&section=calendario", { view: "clase", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1");
    expect(buildBoardUrl("?section=calendario", { view: "alumnos", classSection: "calendario", settingsSection: "cuenta" })).toBe("?view=alumnos");
  });

  it("conserva parámetros desconocidos", () => {
    expect(buildBoardUrl("?project=p1&origen=correo", { view: "profesores", classSection: "tareas", settingsSection: "cuenta" })).toBe("?project=p1&origen=correo&view=profesores");
  });

  it("hace roundtrip con parseBoardUrl", () => {
    const state = parseBoardUrl("?project=p1&view=ajustes&section=administradores");
    expect(parseBoardUrl(buildBoardUrl("?project=p1", state))).toEqual(state);
  });
});
