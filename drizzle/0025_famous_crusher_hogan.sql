CREATE TABLE `mermaid_diagrams` (
	`project_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` text
);
