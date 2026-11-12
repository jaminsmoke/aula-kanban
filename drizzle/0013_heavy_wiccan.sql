CREATE TABLE `deleted_students` (
	`section` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`user_id` text,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deleted_students_project` ON `deleted_students` (`project_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `deleted_teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`user_id` text,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deleted_teachers_project` ON `deleted_teachers` (`project_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `administrators_unified` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`user_id` text,
	`display_name` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`mutation_token` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unified_administrator_email` ON `administrators_unified` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `unified_administrator_user_id` ON `administrators_unified` (`user_id`);--> statement-breakpoint
ALTER TABLE `teachers` ADD `display_name` text DEFAULT '' NOT NULL;