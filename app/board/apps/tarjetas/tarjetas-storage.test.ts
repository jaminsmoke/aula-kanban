import { beforeEach, describe, expect, it } from "vitest";
import { createTarjetasProgressState, parseTarjetasProgress } from "./tarjetas-storage";

describe("progreso local de Tarjetas", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda y recupera el progreso con la envoltura versionada", () => {
    const state = createTarjetasProgressState("p1");
    const progress = { version: 1 as const, schedules: {} };

    expect(state.write(progress)).toEqual({ ok: true });
    expect(JSON.parse(window.localStorage.getItem("aula-kanban-tarjetas:p1") ?? "null")).toMatchObject({
      __aulaClientStorage: 1,
      version: 1,
      data: progress,
    });
    expect(state.read()).toEqual(progress);
  });

  it("migra el progreso legado y rechaza datos corruptos", () => {
    const legacy = { version: 1, schedules: { c1: { dueAt: "2026-11-20T00:00:00.000Z" } } };
    window.localStorage.setItem("aula-kanban-tarjetas:p1", JSON.stringify(legacy));
    expect(createTarjetasProgressState("p1").readResult()).toMatchObject({
      value: legacy,
      status: "ok",
      migrated: true,
    });

    window.localStorage.setItem("aula-kanban-tarjetas:p1", JSON.stringify({ version: 2, schedules: {} }));
    expect(createTarjetasProgressState("p1").readResult()).toMatchObject({
      value: { version: 1, schedules: {} },
      status: "invalid",
    });
    expect(parseTarjetasProgress({ version: 2, schedules: {} })).toBeNull();
  });
});
