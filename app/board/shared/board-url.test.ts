import { describe, expect, it } from "vitest";
import { buildBoardUrl, parseBoardUrl } from "./board-url";

const defaults = {
  view: "clase" as const,
  classSection: "tareas" as const,
  settingsSection: "cuenta" as const,
  administracionSection: "alumnos" as const,
};

describe("parseBoardUrl", () => {
  it("usa Clase > Tareas cuando no hay parámetros", () => {
    expect(parseBoardUrl("")).toEqual({ ...defaults, app: null });
    expect(parseBoardUrl("?project=p1")).toEqual({ ...defaults, app: null });
  });

  it("lee vista y sección de la URL sin tocar el proyecto", () => {
    expect(parseBoardUrl("?project=p1&view=administracion")).toEqual({ ...defaults, view: "administracion", app: null });
    expect(parseBoardUrl("?project=p1&view=administracion&section=profesores")).toEqual({ ...defaults, view: "administracion", administracionSection: "profesores", app: null });
    expect(parseBoardUrl("?project=p1&view=administracion&section=tienda")).toEqual({ ...defaults, view: "administracion", administracionSection: "tienda", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=administradores")).toEqual({ ...defaults, view: "ajustes", settingsSection: "administradores", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=apariencia")).toEqual({ ...defaults, view: "ajustes", settingsSection: "apariencia", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=tokens")).toEqual({ ...defaults, view: "ajustes", settingsSection: "tokens", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=almacenamiento")).toEqual({ ...defaults, view: "ajustes", settingsSection: "almacenamiento", app: null });
    expect(parseBoardUrl("?project=p1&view=documentacion")).toEqual({ ...defaults, view: "ajustes", settingsSection: "documentacion", app: null });
    expect(parseBoardUrl("?project=p1&view=ajustes&section=documentacion")).toEqual({ ...defaults, view: "ajustes", settingsSection: "documentacion", app: null });
  });

  it("lee las URLs antiguas de alumnado y profesorado como Administración", () => {
    expect(parseBoardUrl("?project=p1&view=alumnos")).toEqual({ ...defaults, view: "administracion", app: null });
    expect(parseBoardUrl("?project=p1&view=profesores")).toEqual({ ...defaults, view: "administracion", administracionSection: "profesores", app: null });
  });

  it("lee la sección de calendario dentro de Clase", () => {
    expect(parseBoardUrl("?view=clase&section=calendario")).toEqual({ ...defaults, classSection: "calendario", app: null });
    expect(parseBoardUrl("?project=p1&section=calendario")).toEqual({ ...defaults, classSection: "calendario", app: null });
    expect(parseBoardUrl("?section=diario")).toEqual({ ...defaults, app: null });
  });

  it("lee la app a abrir en Tienda y la ignora fuera de esa sección", () => {
    expect(parseBoardUrl("?project=p1&view=espacio&app=mermaid")).toEqual({ ...defaults, view: "administracion", administracionSection: "tienda", app: "mermaid" });
    expect(parseBoardUrl("?project=p1&view=administracion&section=tienda&app=mermaid")).toEqual({ ...defaults, view: "administracion", administracionSection: "tienda", app: "mermaid" });
    expect(parseBoardUrl("?project=p1&view=administracion&section=profesores&app=mermaid")).toEqual({ ...defaults, view: "administracion", administracionSection: "profesores", app: null });
    expect(parseBoardUrl("?project=p1&view=clase&app=mermaid")).toEqual({ ...defaults, app: null });
  });

  it("resuelve valores inválidos al defecto de la vista", () => {
    expect(parseBoardUrl("?view=inexistente")).toEqual({ ...defaults, app: null });
    expect(parseBoardUrl("?view=ajustes&section=tareas")).toEqual({ ...defaults, view: "ajustes", app: null });
    expect(parseBoardUrl("?view=clase&section=administradores")).toEqual({ ...defaults, settingsSection: "administradores", app: null });
  });
});

describe("buildBoardUrl", () => {
  it("omite los valores por defecto y conserva el proyecto", () => {
    expect(buildBoardUrl("?project=p1", defaults)).toBe("?project=p1");
    expect(buildBoardUrl("", defaults)).toBe("");
    expect(buildBoardUrl("?project=p1&view=ajustes", { ...defaults, view: "ajustes" })).toBe("?project=p1&view=ajustes");
  });

  it("escribe vista y sección no por defecto y limpia la sección al cambiar de vista", () => {
    expect(buildBoardUrl("?project=p1", { ...defaults, view: "administracion" })).toBe("?project=p1&view=administracion");
    expect(buildBoardUrl("?project=p1", { ...defaults, view: "administracion", administracionSection: "profesores" })).toBe("?project=p1&view=administracion&section=profesores");
    expect(buildBoardUrl("?project=p1", { ...defaults, view: "administracion", administracionSection: "tienda" })).toBe("?project=p1&view=administracion&section=tienda");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { ...defaults, view: "ajustes", settingsSection: "administradores" })).toBe("?project=p1&view=ajustes&section=administradores");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=apariencia", { ...defaults, view: "ajustes", settingsSection: "apariencia" })).toBe("?project=p1&view=ajustes&section=apariencia");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=tokens", { ...defaults, view: "ajustes", settingsSection: "tokens" })).toBe("?project=p1&view=ajustes&section=tokens");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=almacenamiento", { ...defaults, view: "ajustes", settingsSection: "almacenamiento" })).toBe("?project=p1&view=ajustes&section=almacenamiento");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=documentacion", { ...defaults, view: "ajustes", settingsSection: "documentacion" })).toBe("?project=p1&view=ajustes&section=documentacion");
    expect(buildBoardUrl("?project=p1&view=documentacion", { ...defaults, view: "documentacion" })).toBe("?project=p1&view=ajustes&section=documentacion");
    expect(buildBoardUrl("?project=p1&view=ajustes&section=administradores", { ...defaults, view: "administracion" })).toBe("?project=p1&view=administracion");
  });

  it("canoniza las URLs antiguas de alumnado y profesorado", () => {
    const alumnos = parseBoardUrl("?project=p1&view=alumnos");
    const profesores = parseBoardUrl("?project=p1&view=profesores");
    expect(buildBoardUrl("?project=p1&view=alumnos", alumnos)).toBe("?project=p1&view=administracion");
    expect(buildBoardUrl("?project=p1&view=profesores", profesores)).toBe("?project=p1&view=administracion&section=profesores");
  });

  it("escribe la sección de calendario y la omite al volver a Tareas", () => {
    expect(buildBoardUrl("?project=p1", { ...defaults, classSection: "calendario" })).toBe("?project=p1&section=calendario");
    expect(buildBoardUrl("?project=p1&section=calendario", defaults)).toBe("?project=p1");
    expect(buildBoardUrl("?section=calendario", { ...defaults, view: "administracion", classSection: "calendario" })).toBe("?view=administracion");
  });

  it("canoniza el alias de Tienda y escribe app solo en esa sección", () => {
    expect(buildBoardUrl("?project=p1", { ...defaults, view: "espacio", app: "mermaid" })).toBe("?project=p1&view=administracion&section=tienda&app=mermaid");
    expect(buildBoardUrl("?project=p1&view=espacio&app=mermaid", { ...defaults, view: "espacio" })).toBe("?project=p1&view=administracion&section=tienda");
    expect(buildBoardUrl("?project=p1&view=espacio&app=mermaid", { ...defaults, app: "mermaid" })).toBe("?project=p1");
    expect(buildBoardUrl("?project=p1&view=administracion&section=tienda&app=mermaid", { ...defaults, view: "administracion", administracionSection: "tienda", app: "mermaid" })).toBe("?project=p1&view=administracion&section=tienda&app=mermaid");
    expect(buildBoardUrl("?project=p1&view=administracion&section=tienda&app=mermaid", { ...defaults, view: "administracion", administracionSection: "profesores" })).toBe("?project=p1&view=administracion&section=profesores");
  });

  it("conserva parámetros desconocidos", () => {
    expect(buildBoardUrl("?project=p1&origen=correo", { ...defaults, view: "administracion", administracionSection: "profesores" })).toBe("?project=p1&origen=correo&view=administracion&section=profesores");
  });

  it("hace roundtrip con parseBoardUrl, incluido el alias de Tienda", () => {
    const state = parseBoardUrl("?project=p1&view=ajustes&section=almacenamiento");
    expect(parseBoardUrl(buildBoardUrl("?project=p1", state))).toEqual(state);
    const tienda = parseBoardUrl("?project=p1&view=espacio&app=mermaid");
    expect(parseBoardUrl(buildBoardUrl("?project=p1", tienda))).toEqual(tienda);
  });
});
