import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const transitionState = sqliteTable("transition_state", {
  id: text("id").primaryKey().notNull(),
  status: text("status").notNull(),
});

export const legacyAdministrators = sqliteTable("administrators", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull(),
  userId: text("user_id"),
  profileId: text("profile_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("administrator_email").on(table.email),
  uniqueIndex("administrator_user_id").on(table.userId),
  uniqueIndex("administrator_profile").on(table.profileId),
]);

export const administrators = sqliteTable("administrators_unified", {
  id: text("id").primaryKey().notNull(),
  email: text("email"),
  userId: text("user_id"),
  displayName: text("display_name").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  mutationToken: text("mutation_token"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("unified_administrator_email").on(table.email),
  uniqueIndex("unified_administrator_user_id").on(table.userId),
]);

// Global administrator profiles may exist without an account or invitation.
export const administratorProfiles = sqliteTable("administrator_profiles", {
  id: text("id").primaryKey().notNull(),
  displayName: text("display_name").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  mutationToken: text("mutation_token"),
});

export const userIdentities = sqliteTable("user_identities", {
  id: text("id").primaryKey().notNull(),
  displayName: text("display_name").notNull(),
});

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull().default(""),
  role: text("role").notNull(),
  activities: text("activities").notNull(),
  aiHelp: text("ai_help").notNull(),
  revision: integer("revision").notNull().default(1),
  mutationToken: text("mutation_token"),
}, (table) => [index("teachers_project_name").on(table.projectId, table.name, table.id)]);

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
}, (table) => [index("tasks_project_order").on(table.projectId, table.createdAt, table.id)]);

export const taskAssignees = sqliteTable("task_assignees", {
  id: text("id").primaryKey().notNull(),
  taskId: text("task_id").notNull(),
  projectId: text("project_id").notNull(),
  kind: text("kind").notNull(),
  profileId: text("profile_id").notNull(),
}, (table) => [uniqueIndex("task_assignee_profile").on(table.taskId, table.kind, table.profileId), index("task_assignees_project_task").on(table.projectId, table.taskId)]);

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
  mutationToken: text("mutation_token"),
}, (table) => [index("students_project_active").on(table.projectId, table.deleted, table.section)]);

export const deletedStudents = sqliteTable("deleted_students", {
  section: text("section").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull().default(""),
  displayName: text("display_name").notNull().default(""),
  userId: text("user_id"),
  deletedAt: integer("deleted_at").notNull(),
}, (table) => [index("deleted_students_project").on(table.projectId, table.deletedAt)]);

export const deletedTeachers = sqliteTable("deleted_teachers", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull().default(""),
  displayName: text("display_name").notNull().default(""),
  userId: text("user_id"),
  deletedAt: integer("deleted_at").notNull(),
}, (table) => [index("deleted_teachers_project").on(table.projectId, table.deletedAt)]);

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
  index("project_members_user_status").on(table.userId, table.status, table.projectId),
  index("project_members_invitation").on(table.email, table.status),
]);
