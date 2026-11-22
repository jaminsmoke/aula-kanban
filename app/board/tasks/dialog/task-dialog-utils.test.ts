import { describe, expect, it } from "vitest";
import { blank } from "../../shared/model";
import { sameTaskFields } from "./task-dialog-utils";

describe("sameTaskFields", () => {
  it("considera igual un formulario intacto y distingue cambios reales", () => {
    const original = { ...blank, title: "Investigar placas", assignees: [{ kind: "student" as const, profileId: "s1", name: "Ada" }] };

    expect(sameTaskFields({ ...original }, original)).toBe(true);
    expect(sameTaskFields({ ...original, title: "Otra tarea" }, original)).toBe(false);
    expect(sameTaskFields({ ...original, documentId: "doc1" }, original)).toBe(false);
    expect(sameTaskFields({ ...original, assignees: [{ kind: "student", profileId: "s2", name: "Grace" }] }, original)).toBe(false);
  });

  it("vuelve a considerar limpio el formulario al deshacer el cambio", () => {
    const original = { ...blank, title: "Investigar placas" };
    const changed = { ...original, title: "Investigar placas y sensores" };

    expect(sameTaskFields(changed, original)).toBe(false);
    expect(sameTaskFields({ ...changed, title: original.title }, original)).toBe(true);
  });
});
