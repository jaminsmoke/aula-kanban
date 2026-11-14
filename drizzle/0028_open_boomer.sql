CREATE TABLE `instance_owner` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`claimed_at` integer NOT NULL
);
