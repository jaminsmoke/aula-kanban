import { describe, expect, it } from "vitest";
import type { Student } from "../../../lib/domain/student";
import type { Task } from "../../../lib/domain/task";
import { canClaimTask, claimChanges, isFreeTask, ownAssignee } from "./claim";

const student: Student = {
  section: "s1",
  name: "Ada Lovelace",
  displayName: "Ada",
  role: "Alumna",
  activities: "",
  aiHelp: "",
  revision: 1,
};

const task = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Investigar placas",
  description: "Buscar sensores",
  imageUrl: "",
  assignee: "Por definir",
  assignees: [],
  dueDate: "2026-11-30",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 3,
  ...overrides,
});

describe("contrato de autoasignación", () => {
  it("detecta una tarea libre con o sin texto heredado", () => {
    expect(isFreeTask(task())).toBe(true);
    expect(isFreeTask(task({ assignee: "" }))).toBe(true);
    expect(isFreeTask(task({ assignee: "Ada" }))).toBe(false);
    expect(isFreeTask(task({ assignees: [{ kind: "student", profileId: "s1", name: "Ada" }] }))).toBe(false);
  });

  it("solo permite reclamar con una ficha propia y sin rol gestor o invitado", () => {
    expect(canClaimTask({ task: task(), ownStudent: student, canManage: false, isGuest: false })).toBe(true);
    expect(canClaimTask({ task: task(), ownStudent: undefined, canManage: false, isGuest: false })).toBe(false);
    expect(canClaimTask({ task: task(), ownStudent: student, canManage: true, isGuest: false })).toBe(false);
    expect(canClaimTask({ task: task(), ownStudent: student, canManage: false, isGuest: true })).toBe(false);
    expect(canClaimTask({ task: task({ assignee: "Ada" }), ownStudent: student, canManage: false, isGuest: false })).toBe(false);
  });

  it("construye la asignación y el PATCH con la revisión actual", () => {
    expect(ownAssignee(student)).toEqual({ kind: "student", profileId: "s1", name: "Ada" });
    expect(claimChanges(task(), student)).toEqual({
      id: "t1",
      revision: 3,
      changes: expect.objectContaining({
        title: "Investigar placas",
        assignee: "Ada",
        assignees: [{ kind: "student", profileId: "s1", name: "Ada" }],
        status: "pending",
      }),
    });
  });
});
