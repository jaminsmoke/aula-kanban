-- Custom SQL migration file, put your code below! --
CREATE TRIGGER projects_prevent_orphan_delete BEFORE DELETE ON projects
WHEN EXISTS (SELECT 1 FROM tasks WHERE project_id = OLD.id)
 OR EXISTS (SELECT 1 FROM students WHERE project_id = OLD.id)
 OR EXISTS (SELECT 1 FROM teachers WHERE project_id = OLD.id)
 OR EXISTS (SELECT 1 FROM project_members WHERE project_id = OLD.id)
 OR EXISTS (SELECT 1 FROM task_assignees WHERE project_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'Project has dependent records'); END;
--> statement-breakpoint
CREATE TRIGGER tasks_project_immutable BEFORE UPDATE OF project_id ON tasks
WHEN NEW.project_id <> OLD.project_id BEGIN SELECT RAISE(ABORT, 'Task project cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER students_project_immutable BEFORE UPDATE OF project_id ON students
WHEN NEW.project_id <> OLD.project_id BEGIN SELECT RAISE(ABORT, 'Student project cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER teachers_project_immutable BEFORE UPDATE OF project_id ON teachers
WHEN NEW.project_id <> OLD.project_id BEGIN SELECT RAISE(ABORT, 'Teacher project cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER members_project_immutable BEFORE UPDATE OF project_id ON project_members
WHEN NEW.project_id <> OLD.project_id BEGIN SELECT RAISE(ABORT, 'Member project cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER task_assignees_immutable BEFORE UPDATE ON task_assignees
BEGIN SELECT RAISE(ABORT, 'Replace task assignments instead of updating them'); END;
--> statement-breakpoint
CREATE TRIGGER members_state_insert BEFORE INSERT ON project_members
WHEN NOT ((NEW.role = 'student' AND NEW.student_section IS NOT NULL AND NEW.teacher_id IS NULL)
 OR (NEW.role = 'teacher' AND NEW.teacher_id IS NOT NULL AND NEW.student_section IS NULL)
 OR (NEW.role = 'guest' AND NEW.student_section IS NULL AND NEW.teacher_id IS NULL))
 OR NOT ((NEW.status = 'pending' AND NEW.user_id IS NULL) OR (NEW.status = 'active' AND NEW.user_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Invalid membership state'); END;
--> statement-breakpoint
CREATE TRIGGER members_state_update BEFORE UPDATE ON project_members
WHEN NOT ((NEW.role = 'student' AND NEW.student_section IS NOT NULL AND NEW.teacher_id IS NULL)
 OR (NEW.role = 'teacher' AND NEW.teacher_id IS NOT NULL AND NEW.student_section IS NULL)
 OR (NEW.role = 'guest' AND NEW.student_section IS NULL AND NEW.teacher_id IS NULL))
 OR NOT ((NEW.status = 'pending' AND NEW.user_id IS NULL) OR (NEW.status = 'active' AND NEW.user_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'Invalid membership state'); END;
--> statement-breakpoint
CREATE TRIGGER administrators_validate_profile_insert BEFORE INSERT ON administrators
WHEN NEW.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM administrator_profiles WHERE id = NEW.profile_id)
BEGIN SELECT RAISE(ABORT, 'Administrator profile does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER administrators_validate_profile_update BEFORE UPDATE OF profile_id ON administrators
WHEN NEW.profile_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM administrator_profiles WHERE id = NEW.profile_id)
BEGIN SELECT RAISE(ABORT, 'Administrator profile does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER administrator_profiles_prevent_orphan_delete BEFORE DELETE ON administrator_profiles
WHEN EXISTS (SELECT 1 FROM administrators WHERE profile_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'Administrator profile has an account'); END;
--> statement-breakpoint
CREATE TRIGGER administrator_profile_email_revision AFTER UPDATE OF email ON administrators
WHEN NEW.email <> OLD.email AND NEW.profile_id IS NOT NULL
BEGIN UPDATE administrator_profiles SET revision = revision + 1 WHERE id = NEW.profile_id; END;
--> statement-breakpoint
CREATE TRIGGER student_profile_email_revision AFTER UPDATE OF email ON project_members
WHEN NEW.email <> OLD.email AND NEW.student_section IS NOT NULL
BEGIN UPDATE students SET revision = revision + 1 WHERE section = NEW.student_section AND project_id = NEW.project_id AND deleted = 0; END;
--> statement-breakpoint
CREATE TRIGGER teacher_profile_email_revision AFTER UPDATE OF email ON project_members
WHEN NEW.email <> OLD.email AND NEW.teacher_id IS NOT NULL
BEGIN UPDATE teachers SET revision = revision + 1 WHERE id = NEW.teacher_id AND project_id = NEW.project_id; END;
