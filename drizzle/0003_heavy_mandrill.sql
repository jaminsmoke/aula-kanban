CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `students` ADD `project_id` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `project_id` text DEFAULT 'default' NOT NULL;