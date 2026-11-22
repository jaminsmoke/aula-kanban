import { describe, expect, it } from "vitest";
import type { TaskFields } from "../../../../lib/domain/task";
import { blank } from "../../shared/model";
import { sameTaskFields } from "./task-dialog-utils";

describe("sameTaskFields", () => {
  it("considera igual un formulario intacto y distingue cambios reales", () => {
    const original: TaskFields = {
      ...blank,
      title: "Investigar placas",
      description: "Buscar sensores",
      imageUrl: "https://ejemplo.com/foto.jpg",
      assignee: "Ada",
      dueDate: "2026-11-30",
      priority: "high",
      status: "active",
      documentId: "doc1",
      assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
    };

    expect(sameTaskFields({ ...original }, original)).toBe(true);
    const variants: Partial<TaskFields>[] = [
      { title: "Otra tarea" },
      { description: "Otra descripción" },
      { imageUrl: "" },
      { assignee: "Grace" },
      { dueDate: "" },
      { priority: "low" },
      { status: "done" },
      { documentId: null },
      { assignees: [{ kind: "student", profileId: "s2", name: "Grace" }] },
      { assignees: [] },
    ];
    for (const variant of variants) {
      expect(sameTaskFields({ ...original, ...variant }, original)).toBe(false);
    }
  });

  it("vuelve a considerar limpio el formulario al deshacer el cambio", () => {
    const original = { ...blank, title: "Investigar placas" };
    const changed = { ...original, title: "Investigar placas y sensores" };

    expect(sameTaskFields(changed, original)).toBe(false);
    expect(sameTaskFields({ ...changed, title: original.title }, original)).toBe(true);
  });
});
