CREATE TABLE `aula_document_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`document_id` text NOT NULL,
	`parent_id` text,
	`author_user_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`anchor` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` text
);
--> statement-breakpoint
CREATE INDEX `aula_document_comments_document_status` ON `aula_document_comments` (`project_id`,`document_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `aula_document_comments_thread` ON `aula_document_comments` (`project_id`,`document_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `aula_document_comments_version` ON `aula_document_comments` (`project_id`,`document_id`,`updated_at`);