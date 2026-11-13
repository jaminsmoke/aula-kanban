CREATE TABLE `instance_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`installed` integer DEFAULT 0 NOT NULL,
	`version` text,
	`installed_by_user_id` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instance_app_app` ON `instance_apps` (`app_id`);