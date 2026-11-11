export const statuses = ["pending", "active", "review", "done"] as const;
export const priorities = ["low", "normal", "high"] as const;
export const priorityNames = { low: "Baja", normal: "Media", high: "Alta" };

export type TaskFields = {
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: (typeof priorities)[number];
  status: (typeof statuses)[number];
};

export type Task = TaskFields & { id: string; createdAt: number; revision: number };
