CREATE TABLE `space_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`app_id` text NOT NULL,
	`installed` integer DEFAULT 0 NOT NULL,
	`version` text,
	`installed_by_user_id` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `space_app_project_app` ON `space_apps` (`project_id`,`app_id`);--> statement-breakpoint
CREATE INDEX `space_apps_project` ON `space_apps` (`project_id`);