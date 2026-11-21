import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

// Correspondencia de identificadores antiguos; completed=0 solo existe dentro
// de la transacción que traslada las referencias del proyecto.
export const projectRekeys = sqliteTable("project_rekeys", {
  oldId: text("old_id").primaryKey().notNull(),
  newId: text("new_id").notNull(),
  completed: integer("completed").notNull().default(0),
}, (table) => [uniqueIndex("project_rekeys_new").on(table.newId)]);

// Una sola fila con id "owner" guarda la identidad estable del propietario.
export const instanceOwner = sqliteTable("instance_owner", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  claimedAt: integer("claimed_at").notNull(),
});

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
  // "web" o "mcp" para las subidas nuevas; NULL en las anteriores.
  origin: text("origin"),
  ownerUserId: text("owner_user_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("uploads_project").on(table.projectId, table.createdAt)]);

// Copias portables de Aula Documentos. El id coincide con la fila de
// `uploads` que guarda el ZIP en R2; esta tabla aporta los metadatos que
// permiten listar sin abrir el archivo.
export const documentCopies = sqliteTable("document_copies", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  documentId: text("document_id"),
  title: text("title").notNull(),
  format: text("format").notNull(),
  formatVersion: integer("format_version").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  ownerUserId: text("owner_user_id"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("document_copies_project").on(table.projectId, table.createdAt),
  index("document_copies_document").on(table.projectId, table.documentId),
]);

// Estado de las aplicaciones nativas (librerías npm del propio Site) instaladas
// en «Tienda». Es por instancia: el dueño o un administrador decide qué
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

// Preferencias personales de la mochila del alumnado y el maletín docente
// (APP-03): una fila por usuario, proyecto y app con su favorito y su
// posición de presentación. La ausencia de fila equivale a «no favorita»
// y sin posición, con el orden del catálogo como defecto. Nunca insta-
// lan ni desinstalan: la instalación sigue siendo de instancia.
export const appPreferences = sqliteTable("app_preferences", {
  projectId: text("project_id").notNull(),
  userId: text("user_id").notNull(),
  appId: text("app_id").notNull(),
  favorite: integer("favorite").notNull().default(0),
  position: integer("position"),
  /** Carpeta personal de la app; `null` = icono suelto en el escritorio. */
  folder: text("folder"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.userId, table.appId] }),
  index("app_preferences_user").on(table.projectId, table.userId),
]);

// Libros habilitados por proyecto (STORE-04): una fila por proyecto y
// libro con el que el docente (o un administrador) habilita como herra-
// mienta en la mochila del alumnado y el maletín docente. La ausencia
// de fila equivale a «no habilitado». Solo quién es quién: el catálogo
// de libros vive en código (`lib/books.ts`).
export const projectBooks = sqliteTable("project_books", {
  projectId: text("project_id").notNull(),
  bookId: text("book_id").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.bookId] }),
  index("project_books_book").on(table.bookId),
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

// Documentos de la suite de Aula Documentos. La fila `legacy` se crea desde
// `app_documents` y las demás usan un UUID; el estado canónico se guarda aquí.
export const aulaDocuments = sqliteTable("aula_documents", {
  projectId: text("project_id").notNull(),
  id: text("id").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  state: text("state").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  archivedAt: integer("archived_at"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.id] }),
  index("aula_documents_project_status").on(table.projectId, table.status, table.updatedAt),
]);

// Comentarios de revisión de Aula Documentos. Viven fuera del estado canónico
// para que revisar no cambie el contenido ni las exportaciones del documento.
export const aulaDocumentComments = sqliteTable("aula_document_comments", {
  id: text("id").primaryKey().notNull(),
  projectId: text("project_id").notNull(),
  documentId: text("document_id").notNull(),
  parentId: text("parent_id"),
  authorUserId: text("author_user_id"),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  anchor: text("anchor").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  resolvedAt: integer("resolved_at"),
  resolvedBy: text("resolved_by"),
}, (table) => [
  index("aula_document_comments_document_status").on(table.projectId, table.documentId, table.status, table.createdAt),
  index("aula_document_comments_thread").on(table.projectId, table.documentId, table.parentId),
  index("aula_document_comments_version").on(table.projectId, table.documentId, table.updatedAt),
]);

// Tokens personales del servidor MCP: cada fila pertenece a una cuenta y se
// guarda solo el hash del secreto, con sal por token. El token completo se
// muestra un único vez al crearlo; revocar marca `revoked_at`.
export const mcpTokens = sqliteTable("mcp_tokens", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  label: text("label").notNull().default(""),
  tokenHash: text("token_hash").notNull(),
  salt: text("salt").notNull(),
  lastUsedAt: integer("last_used_at"),
  createdAt: integer("created_at").notNull(),
  revokedAt: integer("revoked_at"),
}, (table) => [index("mcp_tokens_user").on(table.userId, table.revokedAt, table.createdAt)]);

// Servidor de autorización OAuth (AS) del roadmap OAuth 2.1: clientes registrados
// (RFC 7591) y tokens/códigos ligados a una cuenta y a la instancia.
// Solo se guardan hashes con sal, como en `mcp_tokens`.

export const oauthClients = sqliteTable("oauth_clients", {
  clientId: text("client_id").primaryKey().notNull(),
  clientSecretHash: text("client_secret_hash").notNull(),
  clientSecretSalt: text("client_secret_salt").notNull(),
  clientName: text("client_name").notNull().default(""),
  redirectUris: text("redirect_uris").notNull().default("[]"),
  scopes: text("scopes").notNull().default("mcp:read mcp:write"),
  createdAt: integer("created_at").notNull(),
});

export const oauthAuthorizationCodes = sqliteTable("oauth_authorization_codes", {
  id: text("id").primaryKey().notNull(),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  scope: text("scope").notNull().default(""),
  resource: text("resource").notNull().default(""),
  expiresAt: integer("expires_at").notNull(),
  consumedAt: integer("consumed_at"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("oauth_authorization_codes_client").on(table.clientId, table.expiresAt)]);

export const oauthAccessTokens = sqliteTable("oauth_access_tokens", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  clientId: text("client_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  salt: text("salt").notNull(),
  scope: text("scope").notNull().default(""),
  resource: text("resource").notNull().default(""),
  expiresAt: integer("expires_at").notNull(),
  lastUsedAt: integer("last_used_at"),
  createdAt: integer("created_at").notNull(),
  revokedAt: integer("revoked_at"),
}, (table) => [index("oauth_access_tokens_user").on(table.userId, table.revokedAt, table.createdAt)]);

export const oauthRefreshTokens = sqliteTable("oauth_refresh_tokens", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull().default(""),
  clientId: text("client_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  salt: text("salt").notNull(),
  scope: text("scope").notNull().default(""),
  resource: text("resource").notNull().default(""),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  revokedAt: integer("revoked_at"),
}, (table) => [index("oauth_refresh_tokens_user").on(table.userId, table.revokedAt, table.createdAt)]);

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

export const mcpAuditLog = sqliteTable("mcp_audit_log", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  via: text("via").notNull(),
  clientId: text("client_id"),
  toolName: text("tool_name").notNull(),
  projectId: text("project_id"),
  resultCode: text("result_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("mcp_audit_log_created").on(table.createdAt)]);
