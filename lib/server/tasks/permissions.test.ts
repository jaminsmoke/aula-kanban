import { describe, expect, it } from "vitest";
import { createTaskPermissions, sameRefs, taskAuthGuard, unassigned, unlinkedAssigneeText, validateRefs } from "./permissions";
import type { ProjectData } from "./types";

const data = (overrides: Partial<ProjectData> = {}): ProjectData => ({
  profiles: [],
  staff: [],
  removedProfiles: [],
  removedStaff: [],
  refs: [],
  members: [],
  identities: [],
  ...overrides,
});

describe("permisos de tareas", () => {
  it("valida referencias activas, únicas y permite conservar una eliminada", () => {
    const project = data({
      profiles: [{ section: "s1" }] as ProjectData["profiles"],
      staff: [{ id: "t1" }] as ProjectData["staff"],
    });
    expect(validateRefs([{ kind: "student", profileId: "s1" }], project)).toBe(true);
    expect(validateRefs([{ kind: "teacher", profileId: "t1" }], project)).toBe(true);
    expect(validateRefs([{ kind: "student", profileId: "s1" }, { kind: "student", profileId: "s1" }], project)).toBe(false);
    expect(validateRefs([{ kind: "student", profileId: "otra" }], project)).toBe(false);
    expect(validateRefs([{ kind: "student", profileId: "antigua" }], project, [{ kind: "student", profileId: "antigua" }])).toBe(true);
  });

  it("compara referencias sin importar el orden", () => {
    expect(sameRefs([{ kind: "student", profileId: "s1" }, { kind: "teacher", profileId: "t1" }], [{ kind: "teacher", profileId: "t1" }, { kind: "student", profileId: "s1" }])).toBe(true);
    expect(sameRefs([{ kind: "student", profileId: "s1" }], [])).toBe(false);
  });

  it("conserva el responsable heredado solo sin referencias", () => {
    expect(unlinkedAssigneeText([], "Ada")).toBe("Ada");
    expect(unlinkedAssigneeText([{ kind: "student", profileId: "s1" }], "Ada")).toBe("");
    expect(unassigned("Por definir")).toBe(true);
    expect(unassigned("  ")).toBe(true);
    expect(unassigned("Ada")).toBe(false);
  });

  it("construye la guarda SQL correcta por rol", () => {
    expect(taskAuthGuard("owner", "u1", "p1")).toMatchObject({ sql: "1 = 1", args: [] });
    expect(taskAuthGuard("admin", "u1", "p1")).toMatchObject({
      sql: "EXISTS (SELECT 1 FROM administrators_unified WHERE user_id = ?)",
      args: ["u1"],
    });
    expect(taskAuthGuard("teacher", "u1", "p1")).toMatchObject({
      sql: "EXISTS (SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ? AND status = 'active' AND role = ?)",
      args: ["p1", "u1", "teacher"],
    });
  });

  it("limita al alumno a sus propias asignaciones", () => {
    const permissions = createTaskPermissions({ role: "student", studentSection: "s1" });
    expect(permissions.isStudent).toBe(true);
    expect(permissions.own([{ kind: "student", profileId: "s1" }])).toBe(true);
    expect(permissions.own([{ kind: "teacher", profileId: "s1" }])).toBe(false);
    expect(permissions.onlySelfOrNone([])).toBe(true);
    expect(permissions.onlySelfOrNone([{ kind: "student", profileId: "s1" }])).toBe(true);
    expect(permissions.onlySelfOrNone([{ kind: "student", profileId: "s2" }])).toBe(false);
  });
});
