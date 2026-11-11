CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assignee` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
