CREATE TABLE `project_members` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`student_section` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_email` ON `project_members` (`project_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_student` ON `project_members` (`project_id`,`student_section`);