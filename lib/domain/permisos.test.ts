import { describe, expect, it } from "vitest";
import { CAPACIDADES, capacidadConcedida, capacidadesDe, definicionCapacidad, type CapacidadContexto } from "./permisos";

const base: CapacidadContexto = { globalRole: null, projectRole: null };

describe("matriz de permisos (fuente única)", () => {
  it("cada capacidad tiene una sola definición, título y descripción", () => {
    const ids = CAPACIDADES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const definicion of CAPACIDADES) {
      expect(definicion.titulo.length).toBeGreaterThan(0);
      expect(definicion.descripcion.length).toBeGreaterThan(0);
    }
  });

  it("una capacidad de instancia nunca se concede por rol de proyecto", () => {
    for (const definicion of capacidadesDe("instancia")) {
      expect(definicion.proyecto, `${definicion.id} no puede concederse por rol de proyecto`).toEqual([]);
    }
  });

  it("una capacidad de proyecto no se concede por rol global suelto", () => {
    // El dueño y la administración llegan al proyecto con rol owner/admin.
    for (const definicion of capacidadesDe("proyecto")) {
      expect(definicion.global, `${definicion.id} no se concede por rol global`).toEqual([]);
    }
  });

  it("solo la consulta sin proyecto es pública", () => {
    expect(CAPACIDADES.filter((item) => item.publica).map((item) => item.id)).toEqual(["consulta-publica"]);
    expect(capacidadConcedida("consulta-publica", base)).toBe(true);
  });

  it("deniega por defecto una capacidad inexistente", () => {
    expect(definicionCapacidad("inexistente" as never)).toBeUndefined();
    expect(capacidadConcedida("inexistente" as never, base)).toBe(false);
  });

  it("la instalación global es del dueño y la administración, nunca del profesorado", () => {
    expect(capacidadConcedida("instalar-app", { ...base, globalRole: "owner" })).toBe(true);
    expect(capacidadConcedida("instalar-app", { ...base, globalRole: "admin" })).toBe(true);
    expect(capacidadConcedida("instalar-app", { ...base, projectRole: "teacher" })).toBe(false);
    expect(capacidadConcedida("instalar-app", { ...base, projectRole: "owner" })).toBe(false);
  });

  it("los libros los asigna el profesorado del proyecto", () => {
    expect(capacidadConcedida("asignar-libros", { ...base, projectRole: "teacher" })).toBe(true);
    expect(capacidadConcedida("asignar-libros", { ...base, projectRole: "student" })).toBe(false);
    expect(capacidadConcedida("asignar-libros", { ...base, projectRole: "guest" })).toBe(false);
  });

  it("los documentos compartidos excluyen a la cuenta invitada y la pizarra al alumnado", () => {
    expect(capacidadConcedida("editar-documentos", { ...base, projectRole: "student" })).toBe(true);
    expect(capacidadConcedida("editar-documentos", { ...base, projectRole: "guest" })).toBe(false);
    expect(capacidadConcedida("pizarra-proyecto", { ...base, projectRole: "student" })).toBe(false);
    expect(capacidadConcedida("pizarra-proyecto", { ...base, projectRole: "teacher" })).toBe(true);
  });

  it("sin privilegios cruzados: sin rol en el proyecto no hay capacidad de proyecto", () => {
    expect(capacidadConcedida("gestionar-miembros", base)).toBe(false);
    expect(capacidadConcedida("editar-documentos", base)).toBe(false);
  });
});
