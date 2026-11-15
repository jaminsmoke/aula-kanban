CREATE TABLE `app_preferences` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`app_id` text NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`position` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`, `app_id`)
);
--> statement-breakpoint
CREATE INDEX `app_preferences_user` ON `app_preferences` (`project_id`,`user_id`);