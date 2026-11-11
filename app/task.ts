export const statuses = ["pending", "active", "review", "done"] as const;
export const priorities = ["low", "normal", "high"] as const;
export const priorityNames = { low: "Baja", normal: "Media", high: "Alta" };

export type TaskAssignee = { kind: "student" | "teacher"; profileId: string; name: string };

export type TaskFields = {
  title: string;
  description: string;
  assignee: string;
  assignees: TaskAssignee[];
  dueDate: string;
  priority: (typeof priorities)[number];
  status: (typeof statuses)[number];
};

export type Task = TaskFields & { id: string; createdAt: number; revision: number; creator?: string | null };
