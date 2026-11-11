CREATE TABLE `task_assignees` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`profile_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_assignee_profile` ON `task_assignees` (`task_id`,`kind`,`profile_id`);--> statement-breakpoint
CREATE TABLE `user_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `creator_user_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `creator_member_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `creator_name` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `mutation_token` text;
--> statement-breakpoint
CREATE TRIGGER task_assignees_validate_insert BEFORE INSERT ON task_assignees
WHEN NOT EXISTS (SELECT 1 FROM tasks WHERE id = NEW.task_id AND project_id = NEW.project_id)
 OR (NEW.kind = 'student' AND NOT EXISTS (SELECT 1 FROM students WHERE section = NEW.profile_id AND project_id = NEW.project_id AND deleted = 0))
 OR (NEW.kind = 'teacher' AND NOT EXISTS (SELECT 1 FROM teachers WHERE id = NEW.profile_id AND project_id = NEW.project_id))
 OR NEW.kind NOT IN ('student', 'teacher')
BEGIN SELECT RAISE(ABORT, 'Invalid task assignee'); END;
--> statement-breakpoint
CREATE TRIGGER task_assignees_remove_with_task BEFORE DELETE ON tasks
BEGIN DELETE FROM task_assignees WHERE task_id = OLD.id AND project_id = OLD.project_id; END;
--> statement-breakpoint
CREATE TRIGGER task_assignees_remove_with_student BEFORE UPDATE OF deleted ON students
WHEN NEW.deleted = 1 AND OLD.deleted = 0
BEGIN
 UPDATE tasks SET assignee = CASE WHEN (SELECT count(*) FROM task_assignees WHERE task_id = tasks.id) = 1 THEN OLD.display_name ELSE assignee END, revision = revision + 1 WHERE project_id = OLD.project_id AND id IN (SELECT task_id FROM task_assignees WHERE project_id = OLD.project_id AND kind = 'student' AND profile_id = OLD.section);
 DELETE FROM task_assignees WHERE project_id = OLD.project_id AND kind = 'student' AND profile_id = OLD.section;
END;
--> statement-breakpoint
CREATE TRIGGER task_assignees_remove_with_teacher BEFORE DELETE ON teachers
BEGIN
 UPDATE tasks SET assignee = CASE WHEN (SELECT count(*) FROM task_assignees WHERE task_id = tasks.id) = 1 THEN OLD.name ELSE assignee END, revision = revision + 1 WHERE project_id = OLD.project_id AND id IN (SELECT task_id FROM task_assignees WHERE project_id = OLD.project_id AND kind = 'teacher' AND profile_id = OLD.id);
 DELETE FROM task_assignees WHERE project_id = OLD.project_id AND kind = 'teacher' AND profile_id = OLD.id;
END;
