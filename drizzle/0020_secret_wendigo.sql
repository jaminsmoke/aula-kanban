CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`storage_key` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_owner_project` ON `notes` (`project_id`,`owner_user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `notes_email_project` ON `notes` (`project_id`,`owner_email`);