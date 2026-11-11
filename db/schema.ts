import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignee: text("assignee").notNull(),
  dueDate: text("due_date").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  revision: integer("revision").notNull().default(1),
});

export const students = sqliteTable("students", {
  section: text("section").primaryKey().notNull(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  activities: text("activities").notNull(),
  aiHelp: text("ai_help").notNull(),
  deleted: integer("deleted").notNull().default(0),
  revision: integer("revision").notNull().default(1),
});
