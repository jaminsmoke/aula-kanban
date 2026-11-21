import { describe, expect, it } from "vitest";
import { parseAulaDocument } from "./aula-documentos/document";
import {
  DEMO_APPS,
  DEMO_AULA_DOCUMENT,
  DEMO_BOARD,
  DEMO_STUDENTS,
  DEMO_TASKS,
  DEMO_TEACHERS,
  currentMonthDate,
} from "./demo-data";

describe("datos de la demo", () => {
  it("mantiene los recuentos y las cuatro columnas", () => {
    expect(DEMO_STUDENTS).toHaveLength(6);
    expect(DEMO_TEACHERS).toHaveLength(2);
    expect(DEMO_TASKS).toHaveLength(8);
    expect(DEMO_APPS).toHaveLength(5);
    for (const status of ["pending", "active", "review", "done"]) {
      expect(DEMO_TASKS.filter((task) => task.status === status)).toHaveLength(2);
    }
  });

  it("usa ids únicos y estables", () => {
    const ids = [
      ...DEMO_STUDENTS.map((student) => student.section),
      ...DEMO_TEACHERS.map((teacher) => teacher.id),
      ...DEMO_TASKS.map((task) => task.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEMO_TASKS.every((task) => /^[0-9a-f-]{36}$/.test(task.id))).toBe(true);
  });

  it("siembra Aula Documentos con un documento válido y sin el id retirado", () => {
    expect(DEMO_APPS).toContain("aula-documentos");
    expect(DEMO_APPS).not.toContain("mermaid");
    expect(parseAulaDocument(DEMO_AULA_DOCUMENT).ok).toBe(true);
    expect(DEMO_AULA_DOCUMENT.content.content?.some((node) => node.type === "mermaidBlock")).toBe(true);
  });

  it("reparte quince responsables y una pizarra válida", () => {
    const assignees = DEMO_TASKS.flatMap((task) => task.assignees);
    expect(assignees).toHaveLength(15);
    expect(DEMO_BOARD).toMatchObject({ type: "excalidraw", version: 2 });
    expect(DEMO_BOARD.elements.length).toBeGreaterThan(0);
  });

  it("calcula una fecha del mes en curso", () => {
    expect(currentMonthDate(16)).toMatch(/^\d{4}-\d{2}-16$/);
  });
});
