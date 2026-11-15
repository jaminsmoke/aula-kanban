CREATE TABLE `project_rekeys` (
	`old_id` text PRIMARY KEY NOT NULL,
	`new_id` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_rekeys_new` ON `project_rekeys` (`new_id`);
--> statement-breakpoint
DROP TRIGGER tasks_project_immutable;
--> statement-breakpoint
CREATE TRIGGER tasks_project_immutable BEFORE UPDATE OF project_id ON tasks
WHEN NEW.project_id <> OLD.project_id AND NOT EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0)
BEGIN SELECT RAISE(ABORT, 'Task project cannot be changed'); END;
--> statement-breakpoint
DROP TRIGGER students_project_immutable;
--> statement-breakpoint
CREATE TRIGGER students_project_immutable BEFORE UPDATE OF project_id ON students
WHEN NEW.project_id <> OLD.project_id AND NOT EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0)
BEGIN SELECT RAISE(ABORT, 'Student project cannot be changed'); END;
--> statement-breakpoint
DROP TRIGGER teachers_project_immutable;
--> statement-breakpoint
CREATE TRIGGER teachers_project_immutable BEFORE UPDATE OF project_id ON teachers
WHEN NEW.project_id <> OLD.project_id AND NOT EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0)
BEGIN SELECT RAISE(ABORT, 'Teacher project cannot be changed'); END;
--> statement-breakpoint
DROP TRIGGER members_project_immutable;
--> statement-breakpoint
CREATE TRIGGER members_project_immutable BEFORE UPDATE OF project_id ON project_members
WHEN NEW.project_id <> OLD.project_id AND NOT EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0)
BEGIN SELECT RAISE(ABORT, 'Member project cannot be changed'); END;
--> statement-breakpoint
DROP TRIGGER app_documents_project_immutable;
--> statement-breakpoint
CREATE TRIGGER app_documents_project_immutable BEFORE UPDATE OF project_id ON app_documents
WHEN NEW.project_id <> OLD.project_id AND NOT EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0)
BEGIN SELECT RAISE(ABORT, 'Document project cannot be changed'); END;
--> statement-breakpoint
DROP TRIGGER task_assignees_immutable;
--> statement-breakpoint
CREATE TRIGGER task_assignees_immutable BEFORE UPDATE ON task_assignees
WHEN NOT (NEW.id = OLD.id AND NEW.task_id = OLD.task_id AND NEW.kind = OLD.kind AND NEW.profile_id = OLD.profile_id AND EXISTS (SELECT 1 FROM project_rekeys WHERE old_id = OLD.project_id AND new_id = NEW.project_id AND completed = 0))
BEGIN SELECT RAISE(ABORT, 'Replace task assignments instead of updating them'); END;
--> statement-breakpoint
CREATE TRIGGER project_rekeys_cleanup AFTER DELETE ON projects
BEGIN DELETE FROM project_rekeys WHERE new_id = OLD.id; END;
