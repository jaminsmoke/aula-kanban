ALTER TABLE `project_members` ADD `teacher_id` text;--> statement-breakpoint
ALTER TABLE `project_members` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `project_members` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_teacher` ON `project_members` (`project_id`,`teacher_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_user` ON `project_members` (`project_id`,`user_id`);
--> statement-breakpoint
CREATE TRIGGER members_validate_teacher_insert BEFORE INSERT ON project_members
WHEN NEW.teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teachers WHERE id = NEW.teacher_id AND project_id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Teacher does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER members_validate_teacher_update BEFORE UPDATE OF teacher_id ON project_members
WHEN NEW.teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM teachers WHERE id = NEW.teacher_id AND project_id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Teacher does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER students_revoke_before_deletion BEFORE UPDATE OF deleted ON students
WHEN NEW.deleted = 1 AND OLD.deleted = 0
BEGIN DELETE FROM project_members WHERE project_id = OLD.project_id AND student_section = OLD.section; END;
--> statement-breakpoint
CREATE TRIGGER teachers_revoke_before_deletion BEFORE DELETE ON teachers
BEGIN DELETE FROM project_members WHERE project_id = OLD.project_id AND teacher_id = OLD.id; END;
