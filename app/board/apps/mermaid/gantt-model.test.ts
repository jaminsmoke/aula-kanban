import { describe, expect, it } from "vitest";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import {
  createGanttTask,
  parseGanttDocument,
  serializeGanttDocument,
  type GanttDocument,
} from "./gantt-model";

describe("modelo guiado de Gantt", () => {
  it("interpreta el Gantt de la plantilla", () => {
    const gantt = parseGanttDocument(MERMAID_TEMPLATES.find((template) => template.id === "gantt")!.code);

    expect(gantt?.title).toBe("Plan de proyecto");
    expect(gantt?.sections).toHaveLength(2);
    expect(gantt?.sections[0].tasks).toEqual([
      expect.objectContaining({ id: "a1", name: "Buscar fuentes", startMode: "date", startDate: "2026-01-10", duration: "5d" }),
      expect.objectContaining({ id: "a2", name: "Redactar", startMode: "after", afterId: "a1", duration: "7d" }),
    ]);
    expect(gantt?.sections[1].tasks).toHaveLength(2);
  });

  it("serializa de nuevo un código válido y conserva las dependencias", () => {
    const gantt = parseGanttDocument(MERMAID_TEMPLATES.find((template) => template.id === "gantt")!.code)!;
    const code = serializeGanttDocument(gantt);

    expect(code).toContain("gantt");
    expect(code).toContain("title Plan de proyecto");
    expect(code).toContain("section Investigación");
    expect(code).toContain("Redactar :a2, after a1, 7d");
    expect(parseGanttDocument(code)).toEqual(gantt);
  });

  it("permite vaciar el título y sanea nombres y duraciones", () => {
    const gantt: GanttDocument = {
      title: "",
      dateFormat: "YYYY-MM-DD",
      sections: [{
        id: "section-1",
        name: "General",
        tasks: [{
          id: "t1",
          name: "Tarea: con dos puntos",
          startMode: "date",
          startDate: "2026-01-01",
          afterId: "",
          duration: "no válida",
          flags: [],
        }],
      }],
    };
    const code = serializeGanttDocument(gantt);
    expect(code).toContain("section General");
    expect(code).toContain("Tarea con dos puntos :t1, 2026-01-01, 1d");
    expect(code).not.toContain("title ");
    expect(parseGanttDocument(code)).not.toBeNull();
  });

  it("rechaza código que el formulario no sabe interpretar", () => {
    expect(parseGanttDocument("flowchart TD\nA --> B")).toBeNull();
    expect(parseGanttDocument("gantt\n  title Proyecto\n  línea rara")).toBeNull();
    expect(parseGanttDocument("gantt\n  title Proyecto\n  Tarea :sin-fecha")).toBeNull();
  });

  it("genera ids nuevos sin repetirlos", () => {
    const first = createGanttTask([]);
    const second = createGanttTask([first]);
    expect(first.id).toBe("t1");
    expect(second.id).toBe("t2");
    expect(createGanttTask([first, second, { ...first, id: "t3" }]).id).toBe("t4");
  });
});
