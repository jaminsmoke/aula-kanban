-- Custom SQL migration file, put your code below! --
CREATE TRIGGER task_creator_cleanup AFTER DELETE ON tasks
WHEN OLD.creator_user_id IS NOT NULL
BEGIN
  DELETE FROM user_identities WHERE id = OLD.creator_user_id AND NOT EXISTS (SELECT 1 FROM tasks WHERE creator_user_id = OLD.creator_user_id);
END;
