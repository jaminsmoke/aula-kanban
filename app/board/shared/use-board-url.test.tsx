import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBoardUrlState } from "./use-board-url";
import { parseBoardUrl } from "./board-url";

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("useBoardUrlState", () => {
  it("usa el estado inicial que pasa el servidor y no toca la URL", async () => {
    window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=administradores");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("?view=ajustes&section=administradores")));
    expect(result.current.view).toBe("ajustes");
    expect(result.current.settingsSection).toBe("administradores");
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=administradores");
  });

  it("no lee la URL en el primer render: el cliente pinta lo mismo que el servidor", async () => {
    window.history.replaceState({}, "", "/?view=administracion");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("?view=ajustes")));
    expect(result.current.view).toBe("ajustes");
  });

  it("escribe la URL al cambiar de vista y de sección, sin recargar", async () => {
    window.history.replaceState({}, "", "/?project=p1");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("")));
    expect(result.current.view).toBe("clase");

    act(() => result.current.setView("administracion"));
    expect(window.location.search).toBe("?project=p1&view=administracion");

    act(() => result.current.setAdministracionSection("profesores"));
    expect(window.location.search).toBe("?project=p1&view=administracion&section=profesores");

    act(() => result.current.setView("ajustes"));
    act(() => result.current.setSettingsSection("administradores"));
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=administradores");

    act(() => result.current.setView("clase"));
    expect(window.location.search).toBe("?project=p1");
  });

  it("canoniza la URL antigua sin añadir historial", async () => {
    window.history.replaceState({}, "", "/?project=p1&view=alumnos");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("?view=alumnos")));
    expect(result.current.view).toBe("administracion");
    expect(window.location.search).toBe("?project=p1&view=administracion");
  });

  it("guarda y restaura la sección Calendario de Clase", async () => {
    window.history.replaceState({}, "", "/?project=p1");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("")));
    expect(result.current.classSection).toBe("tareas");

    act(() => result.current.setClassSection("calendario"));
    expect(window.location.search).toBe("?project=p1&section=calendario");

    act(() => {
      window.history.replaceState({}, "", "/?project=p1");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.classSection).toBe("tareas");

    act(() => {
      window.history.replaceState({}, "", "/?project=p1&section=calendario");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.classSection).toBe("calendario");
  });

  it("restaura vista y sección con atrás/adelante (popstate)", async () => {
    window.history.replaceState({}, "", "/?project=p1&view=administracion");
    const { result } = renderHook(() => useBoardUrlState(parseBoardUrl("?view=administracion")));
    expect(result.current.view).toBe("administracion");

    act(() => {
      window.history.replaceState({}, "", "/?project=p1&view=ajustes&section=administradores");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.view).toBe("ajustes");
    expect(result.current.settingsSection).toBe("administradores");
    expect(window.location.search).toBe("?project=p1&view=ajustes&section=administradores");
  });
});
