-- Evita nuevos documentos huérfanos sin modificar los datos existentes.
CREATE TRIGGER app_documents_require_project BEFORE INSERT ON app_documents
WHEN NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id)
BEGIN SELECT RAISE(ABORT, 'Project does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER app_documents_project_immutable BEFORE UPDATE OF project_id ON app_documents
WHEN NEW.project_id <> OLD.project_id
BEGIN SELECT RAISE(ABORT, 'Document project cannot be changed'); END;
--> statement-breakpoint
CREATE TRIGGER projects_prevent_orphan_app_documents BEFORE DELETE ON projects
WHEN EXISTS (SELECT 1 FROM app_documents WHERE project_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'Project has application documents'); END;
