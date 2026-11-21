CREATE TABLE `aula_documents` (
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`state` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	`created_by` text,
	`updated_by` text,
	PRIMARY KEY(`project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `aula_documents_project_status` ON `aula_documents` (`project_id`,`status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `document_copies` ADD `document_id` text;--> statement-breakpoint
CREATE INDEX `document_copies_document` ON `document_copies` (`project_id`,`document_id`);