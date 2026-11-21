CREATE TABLE `aula_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`document_id` text NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`schema_version` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_by` text,
	`created_by_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`kind` text NOT NULL,
	`base_updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `aula_document_versions_document` ON `aula_document_versions` (`project_id`,`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `aula_document_versions_kind` ON `aula_document_versions` (`project_id`,`document_id`,`kind`);--> statement-breakpoint
CREATE INDEX `aula_document_versions_base` ON `aula_document_versions` (`project_id`,`document_id`,`base_updated_at`);