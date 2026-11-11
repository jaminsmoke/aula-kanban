CREATE TRIGGER tasks_require_project BEFORE INSERT ON tasks
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Project does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER students_require_project BEFORE INSERT ON students
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Project does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER members_require_project BEFORE INSERT ON project_members
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Project does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER students_unlink_deleted AFTER UPDATE OF deleted ON students
WHEN NEW.deleted = 1 AND OLD.deleted = 0
BEGIN
  UPDATE project_members SET student_section = NULL WHERE project_id = NEW.project_id AND student_section = NEW.section;
END;
--> statement-breakpoint
CREATE TRIGGER members_validate_student_insert BEFORE INSERT ON project_members
WHEN NEW.student_section IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM students WHERE section = NEW.student_section AND project_id = NEW.project_id AND deleted = 0
)
BEGIN SELECT RAISE(ABORT, 'Student does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER members_validate_student_update BEFORE UPDATE OF student_section ON project_members
WHEN NEW.student_section IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM students WHERE section = NEW.student_section AND project_id = NEW.project_id AND deleted = 0
)
BEGIN SELECT RAISE(ABORT, 'Student does not exist'); END;
