CREATE TABLE `administrator_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`mutation_token` text
);
--> statement-breakpoint
ALTER TABLE `administrators` ADD `profile_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `administrator_profile` ON `administrators` (`profile_id`);--> statement-breakpoint
ALTER TABLE `students` ADD `mutation_token` text;--> statement-breakpoint
CREATE INDEX `students_project_active` ON `students` (`project_id`,`deleted`,`section`);--> statement-breakpoint
ALTER TABLE `teachers` ADD `mutation_token` text;--> statement-breakpoint
CREATE INDEX `teachers_project_name` ON `teachers` (`project_id`,`name`,`id`);--> statement-breakpoint
CREATE INDEX `project_members_user_status` ON `project_members` (`user_id`,`status`,`project_id`);--> statement-breakpoint
CREATE INDEX `project_members_invitation` ON `project_members` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `task_assignees_project_task` ON `task_assignees` (`project_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `tasks_project_order` ON `tasks` (`project_id`,`created_at`,`id`);