import { describe, expect, it } from "vitest";
import type { Task } from "../../../lib/domain/task";
import { profileInfoItems, sortProfileTasks } from "./profile-detail-utils";

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: id,
  description: "",
  imageUrl: "",
  assignee: "Ada",
  assignees: [],
  dueDate: "",
  priority: "normal",
  status: "pending",
  createdAt: 1,
  revision: 0,
  ...overrides,
});

describe("perfil de alumno", () => {
  it("ordena vencidas, próximas, sin fecha y completadas", () => {
    const sorted = sortProfileTasks([
      task("done", { status: "done", dueDate: "2026-11-01" }),
      task("no-date"),
      task("soon", { dueDate: "2026-11-25" }),
      task("overdue", { dueDate: "2026-11-20" }),
      task("review", { status: "review", dueDate: "2026-11-19" }),
    ], "2026-11-22");

    expect(sorted.map((item) => item.id)).toEqual(["review", "overdue", "soon", "no-date", "done"]);
  });

  it("ordena por fecha dentro del mismo grupo", () => {
    const sorted = sortProfileTasks([
      task("b", { dueDate: "2026-11-28" }),
      task("a", { dueDate: "2026-11-24" }),
    ], "2026-11-22");

    expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("omite los datos de perfil vacíos", () => {
    expect(profileInfoItems({ role: "", activities: "Prepara las placas", aiHelp: "  " })).toEqual([
      { key: "activities", label: "Actividades cotidianas", value: "Prepara las placas" },
    ]);
  });
});
