import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const transitionState = sqliteTable("transition_state", {
  id: text("id").primaryKey().notNull(),
  status: text("status").notNull(),
});

// Una sola fila con id "owner" guarda la identidad estable del propietario.
export const instanceOwner = sqliteTable("instance_owner", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  claimedAt: integer("claimed_at").notNull(),
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
  imageUrl: text("image_url"),
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

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: text("owner_id").notNull(),
  snapshot: text("snapshot").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("board_owner").on(table.ownerType, table.ownerId), index("boards_project").on(table.projectId)]);

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  purpose: text("purpose").notNull(),
  ownerUserId: text("owner_user_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("uploads_project").on(table.projectId, table.createdAt)]);

// Estado de las aplicaciones nativas (librerías npm del propio Site) instaladas
// en «Mi espacio». Es por instancia: el dueño o un administrador decide qué
// aplicaciones están disponibles para toda la instancia de Aula Kanban.
export const instanceApps = sqliteTable("instance_apps", {
  id: text("id").primaryKey().notNull(),
  appId: text("app_id").notNull(),
  installed: integer("installed").notNull().default(0),
  version: text("version"),
  installedByUserId: text("installed_by_user_id"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("instance_app_app").on(table.appId),
]);

// Histórica: el estado por proyecto anterior a la instalación por instancia.
// Se conserva para no perder datos ni forzar una migración destructiva.
export const spaceApps = sqliteTable("space_apps", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  appId: text("app_id").notNull(),
  installed: integer("installed").notNull().default(0),
  version: text("version"),
  installedByUserId: text("installed_by_user_id"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("space_app_project_app").on(table.projectId, table.appId),
  index("space_apps_project").on(table.projectId),
]);

// Documentos de las apps nativas: un estado JSON por proyecto y app. Es la
// forma común de guardar el trabajo de cualquier app que lo necesite.
export const appDocuments = sqliteTable("app_documents", {
  projectId: text("project_id").notNull(),
  appId: text("app_id").notNull(),
  state: text("state").notNull(),
  updatedAt: integer("updated_at").notNull(),
  updatedByUserId: text("updated_by_user_id"),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.appId] }),
  index("app_documents_app").on(table.appId, table.updatedAt),
]);

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
