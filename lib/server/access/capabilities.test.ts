import { describe, expect, it } from "vitest";
import { evaluarCapacidad, type CapacidadContexto } from "./capabilities";

const base: CapacidadContexto = { globalRole: null, projectRole: null };

describe("matriz PERM-01", () => {
  it("para instalar apps solo el dueño y el administrador de instancia", () => {
    expect(evaluarCapacidad("instalar-app", { ...base, globalRole: "owner" })).toBe(true);
    expect(evaluarCapacidad("instalar-app", { ...base, globalRole: "admin" })).toBe(true);
  });

  it("el profesor sin rol global nunca instala (aunque sea del proyecto)", () => {
    expect(evaluarCapacidad("instalar-app", { ...base, projectRole: "teacher" })).toBe(false);
    expect(evaluarCapacidad("instalar-app", { ...base, projectRole: "owner" })).toBe(false);
    expect(evaluarCapacidad("instalar-app", base)).toBe(false);
  });

  it("el profesor que también es administrador instala por su rol global", () => {
    expect(evaluarCapacidad("instalar-app", { globalRole: "admin", projectRole: "teacher" })).toBe(true);
    expect(evaluarCapacidad("instalar-app", { globalRole: "owner", projectRole: "teacher" })).toBe(true);
  });

  it("para asignar libros el profesorado del proyecto, el administrador y el dueño", () => {
    expect(evaluarCapacidad("asignar-libros", { ...base, projectRole: "teacher" })).toBe(true);
    expect(evaluarCapacidad("asignar-libros", { ...base, projectRole: "admin" })).toBe(true);
    expect(evaluarCapacidad("asignar-libros", { ...base, projectRole: "owner" })).toBe(true);
  });

  it("el alumnado y el invitado no asignan libros", () => {
    expect(evaluarCapacidad("asignar-libros", { ...base, projectRole: "student" })).toBe(false);
    expect(evaluarCapacidad("asignar-libros", { ...base, projectRole: "guest" })).toBe(false);
    expect(evaluarCapacidad("asignar-libros", base)).toBe(false);
  });

  it("sin privilegios cruzados: un rol en otro proyecto no cuenta", () => {
    // El contexto solo conoce el rol en el proyecto evaluado; un cargo de
    // profesor en un proyecto distinto no aparece aquí y se deniega.
    expect(evaluarCapacidad("asignar-libros", { globalRole: null, projectRole: null })).toBe(false);
    // Un administrador global sí conserva el ámbito porque su acceso al
    // proyecto ya llega como rol global (owner/admin).
    expect(evaluarCapacidad("asignar-libros", { globalRole: "admin", projectRole: "admin" })).toBe(true);
  });
});
