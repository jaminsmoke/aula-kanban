-- Copia los documentos históricos de Blockly y Mermaid a `app_documents`.
-- Es una operación de datos, no de esquema: se ejecuta aparte y es repetible.
-- No sobrescribe documentos nuevos que ya estén en `app_documents`.
INSERT INTO app_documents (project_id, app_id, state, updated_at, updated_by_user_id)
SELECT project_id, 'blockly', state, updated_at, updated_by_user_id
FROM blockly_programs WHERE 1
ON CONFLICT(project_id, app_id) DO NOTHING;

INSERT INTO app_documents (project_id, app_id, state, updated_at, updated_by_user_id)
SELECT project_id, 'mermaid', json_object('code', code), updated_at, updated_by_user_id
FROM mermaid_diagrams WHERE 1
ON CONFLICT(project_id, app_id) DO NOTHING;
