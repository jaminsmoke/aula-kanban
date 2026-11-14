CREATE TABLE `app_documents` (
	`project_id` text NOT NULL,
	`app_id` text NOT NULL,
	`state` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` text,
	PRIMARY KEY(`project_id`, `app_id`)
);
--> statement-breakpoint
CREATE INDEX `app_documents_app` ON `app_documents` (`app_id`,`updated_at`);