CREATE TRIGGER projects_prevent_orphan_history BEFORE DELETE ON projects
WHEN EXISTS (SELECT 1 FROM deleted_students WHERE project_id = OLD.id)
 OR EXISTS (SELECT 1 FROM deleted_teachers WHERE project_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'Project has historical records'); END;
