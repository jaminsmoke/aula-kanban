CREATE TABLE `document_copies` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`format_version` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`owner_user_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `document_copies_project` ON `document_copies` (`project_id`,`created_at`);