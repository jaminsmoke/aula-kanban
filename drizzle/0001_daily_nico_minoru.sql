CREATE TABLE `students` (
	`section` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`activities` text NOT NULL,
	`ai_help` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
