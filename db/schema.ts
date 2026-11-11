import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const administrators = sqliteTable("administrators", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull(),
  userId: text("user_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("administrator_email").on(table.email),
  uniqueIndex("administrator_user_id").on(table.userId),
]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull().default("default"),
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
  projectId: text("project_id").notNull().default("default"),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  activities: text("activities").notNull(),
  aiHelp: text("ai_help").notNull(),
  deleted: integer("deleted").notNull().default(0),
  revision: integer("revision").notNull().default(1),
});

export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  studentSection: text("student_section"),
}, (table) => [
  uniqueIndex("project_member_email").on(table.projectId, table.email),
  uniqueIndex("project_member_student").on(table.projectId, table.studentSection),
]);
