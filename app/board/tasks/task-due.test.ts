import { describe, expect, it } from "vitest";
import { isTaskOverdue } from "./task-due";

describe("vencimiento de tareas", () => {
  it("marca solo pendientes con fecha anterior a hoy", () => {
    expect(isTaskOverdue({ status: "pending", dueDate: "2026-11-21" }, "2026-11-22")).toBe(true);
    expect(isTaskOverdue({ status: "active", dueDate: "2026-11-01" }, "2026-11-22")).toBe(true);
    expect(isTaskOverdue({ status: "review", dueDate: "2026-11-21" }, "2026-11-22")).toBe(true);
    expect(isTaskOverdue({ status: "pending", dueDate: "2026-11-22" }, "2026-11-22")).toBe(false);
    expect(isTaskOverdue({ status: "pending", dueDate: "2026-11-23" }, "2026-11-22")).toBe(false);
  });

  it("excluye completadas y tareas sin fecha", () => {
    expect(isTaskOverdue({ status: "done", dueDate: "2026-11-01" }, "2026-11-22")).toBe(false);
    expect(isTaskOverdue({ status: "pending", dueDate: "" }, "2026-11-22")).toBe(false);
  });
});
