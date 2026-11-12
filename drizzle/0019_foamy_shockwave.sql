CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`snapshot` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `board_owner` ON `boards` (`owner_type`,`owner_id`);--> statement-breakpoint
CREATE INDEX `boards_project` ON `boards` (`project_id`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`url` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`purpose` text NOT NULL,
	`owner_user_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uploads_project` ON `uploads` (`project_id`,`created_at`);