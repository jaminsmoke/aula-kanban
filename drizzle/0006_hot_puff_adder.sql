CREATE TABLE `administrators` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `administrator_email` ON `administrators` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `administrator_user_id` ON `administrators` (`user_id`);