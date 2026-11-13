CREATE TABLE `blockly_programs` (
	`project_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` text
);
