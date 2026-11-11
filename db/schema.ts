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

export const userIdentities = sqliteTable("user_identities", {
  id: text("id").primaryKey().notNull(),
  displayName: text("display_name").notNull(),
});

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  activities: text("activities").notNull(),
  aiHelp: text("ai_help").notNull(),
  revision: integer("revision").notNull().default(1),
});

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
  creatorUserId: text("creator_user_id"),
  creatorMemberId: text("creator_member_id"),
  creatorName: text("creator_name"),
  mutationToken: text("mutation_token"),
});

export const taskAssignees = sqliteTable("task_assignees", {
  id: text("id").primaryKey().notNull(),
  taskId: text("task_id").notNull(),
  projectId: text("project_id").notNull(),
  kind: text("kind").notNull(),
  profileId: text("profile_id").notNull(),
}, (table) => [uniqueIndex("task_assignee_profile").on(table.taskId, table.kind, table.profileId)]);

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
  teacherId: text("teacher_id"),
  userId: text("user_id"),
  status: text("status").notNull().default("pending"),
}, (table) => [
  uniqueIndex("project_member_email").on(table.projectId, table.email),
  uniqueIndex("project_member_student").on(table.projectId, table.studentSection),
  uniqueIndex("project_member_teacher").on(table.projectId, table.teacherId),
  uniqueIndex("project_member_user").on(table.projectId, table.userId),
]);
